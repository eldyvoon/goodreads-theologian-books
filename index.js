import Bottleneck from 'bottleneck';
import data from './data.js';
import gr from './goodreads.js';
import orderBy from 'lodash.orderBy';
import log from 'log-to-file';

const bottleneckLimit = {
  maxConcurrent: 12,
  minTime: 1000,
};

async function mapGoodreadsId(data) {
  async function getAuthor(theologian) {
    const result = await gr.searchAuthors(theologian);
    console.log('t', result);
    if (result && result.author) {
      return result.author;
    }
    return {};
  }

  const limiter = new Bottleneck(bottleneckLimit);

  const throttledgetAuthor = limiter.wrap(getAuthor);

  const allThePromises = data.map(({ theologian }) => {
    return throttledgetAuthor(theologian);
  });

  try {
    const result = await Promise.all(allThePromises);

    console.log('result', result);

    const newData = data
      .map((o, i) => {
        let name1 = o.theologian.replace(/\s/g, '');
        let name2 =
          result[i] && result[i].name && result[i].name.replace(/\s/g, '');

        if (name1 === name2) {
          return {
            ...o,
            goodreadsId: result[i].id,
          };
        }
      })
      .filter((o) => o && Object.keys(o).length > 0);

    return newData;
  } catch (err) {
    console.log(err.message);
  }
}

async function mapAuthorBooks(data) {
  async function getBooksByAuthor(id) {
    const result = await gr.getBooksByAuthor(id);
    console.log('333', result);
    if (result && result.books) {
      return result.books;
    }
    return [];
  }

  const limiter = new Bottleneck(bottleneckLimit);

  const throttledgetBooksByAuthor = limiter.wrap(getBooksByAuthor);
  const allThePromises = data.map(({ goodreadsId }) => {
    return throttledgetBooksByAuthor(goodreadsId);
  });

  try {
    let result = await Promise.all(allThePromises);

    return data
      .map((o, i) => {
        if (result[i].book && result[i].book.length > 0) {
          let books = {
            title: result[i].book[0].title,
            year: +result[i].book[0].published,
            average_rating: +result[i].book[0].average_rating,
            ratings_count: +result[i].book[0].ratings_count,
          };

          return {
            ...o,
            books,
          };
        }
      })
      .filter((xx) => xx && Object.keys(xx).length > 0);
  } catch (err) {
    console.log(err.message);
  }
}

(async function () {
  let result = await mapGoodreadsId(data);
  result = await mapAuthorBooks(result);
  //order by ratings_count
  result = orderBy(result, 'books.ratings_count', ['desc']);
  //log(JSON.stringify(result));
})();

export { mapGoodreadsId };
