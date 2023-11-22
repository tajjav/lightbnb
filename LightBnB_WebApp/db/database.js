const {Pool} = require('pg');
const properties = require("./json/properties.json");
const users = require("./json/users.json");

//Connection with db
const config = {
  user: 'labber',
  password: 'labber',
  host: 'localhost',
  database: 'lightbnb'
}
const pool = new Pool(config);

// test query
// pool.query(`
//   SELECT title
//   FROM properties
//   LIMIT 10;
// `)
// .then(response => {
//   console.log(response);
// })
// .catch(error => {
//   console.error('error from test query:', error);
// });


/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  const queryString = `

  SELECT id, name, email, password
  FROM users
  WHERE email = $1
  LIMIT 1;

  `;
  const values = [`${email}`]
  
  return pool.query(queryString,values)
            .then((response) => {
              //console.log(response.rows);
              if (response.rows.length > 0) {
                return response.rows[0];
              } else {
                return null;
              }
            })
            .catch((error) => {
              console.error(error.message);
            })



  // let resolvedUser = null;
  // for (const userId in users) {
  //   const user = users[userId];
  //   if (user && user.email.toLowerCase() === email.toLowerCase()) {
  //     resolvedUser = user;
  //   }
  // }
  // return Promise.resolve(resolvedUser);
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  const queryString = `

  SELECT id, name, email, password
  FROM users
  WHERE id = $1;

  `;
  const values = [`${id}`]
  return pool.query(queryString,values)
            .then((response) => {
              // console.log(response.rows);
              if (response.rows.length > 0) {
                return response.rows[0];
              } else {
                return null;
              }
            })
            .catch((error) => {
              console.error(error.message);
            })


  //return Promise.resolve(users[id]);
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  const queryString = `

  INSERT INTO users (name, email, password)
  VALUES ($1,$2,$3)
  RETURNING *;

  `;
  const values = [`${user.name}`,`${user.email}`,`${user.password}`];
  return pool.query(queryString,values)
            .then((response) => {
              // console.log(response.rows);
              if (response.rows.length > 0) {
                return response.rows[0];
              } else {
                return null;
              }
            })
            .catch((error) => {
              console.error(error.message);
            })



  // const userId = Object.keys(users).length + 1;
  // user.id = userId;
  // users[userId] = user;
  // return Promise.resolve(user);
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  const queryString = `

  SELECT reservations.*, properties.*, property_reviews.*
  FROM reservations
  LEFT JOIN properties ON reservations.property_id = properties.id
  LEFT JOIN property_reviews ON property_reviews.property_id = properties.id
  WHERE reservations.guest_id = $1
  GROUP BY properties.id, reservations.id, property_reviews.id
  ORDER BY reservations.start_date
  LIMIT $2;

  `;
  const values = [`${guest_id}`,`${limit}`];
  return pool.query(queryString,values)
            .then((response) => {
              // console.log(response.rows);
              if (response.rows.length > 0) {
                return response.rows;
              } else {
                return null;
              }
            })
            .catch((error) => {
              console.error(error.message);
            })


  // return getAllProperties(null, 2);
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 *    {
 *     city,
 *     owner_id,
 *     minimum_price_per_night,
 *     maximum_price_per_night,
 *     minimum_rating;
 *   }
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function (options, limit = 10) {
  const queryParams = [];

  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  LEFT JOIN property_reviews ON properties.id = property_id
  
  `;
  //   SELECT *
  //   FROM properties
  //   LIMIT $1;
  // const values = [`${limit}`];
  if (options.city) {
   
    queryParams.push(`%${options.city}%`);
    
    queryString += `
      WHERE city LIKE $${queryParams.length}
    `;
  }

  if (options.owner_id) {
    if (queryParams.length > 1) {
      queryParams.push(`
        ${options.owner_id}
      `);
      queryString += `
      AND properties.owner_id = $${queryParams.length}
      `;
    } else {
      queryParams.push(`
        ${options.owner_id}
      `);
      queryString += `
        WHERE properties.owner_id = $${queryParams.length}
      `
    }
  }
  if (options.minimum_price_per_night) {
    if (queryParams.length > 1) {
      queryParams.push(`
        ${options.minimum_price_per_night*100}
      `);
      queryString += `
        AND cost_per_night > $${queryParams.length}
      `;
    } else {
      queryParams.push(`
        ${options.minimum_price_per_night*100}
      `);

      queryString += `
        WHERE cost_per_night > $${queryParams.length}
      `;
    }
  }
  if (options.maximum_price_per_night) {
    if (queryParams.length > 1) {
      queryParams.push(`
        ${options.maximum_price_per_night*100}
      `);
      queryString += `
        AND cost_per_night < $${queryParams.length}
      `;
    } else {
      queryParams.push(`
        ${options.maximum_price_per_night*100}
      `);

      queryString += `
        WHERE cost_per_night < $${queryParams.length}
      `;
    }
  }
  if (options.minimum_rating) {
    if (queryParams.length > 1) {
      queryParams.push(`
        ${options.minimum_rating}
      `);
      queryString += `
        AND rating > $${queryParams.length}
      `;
    } else {

      queryParams.push(`
        ${options.minimum_rating}
      `);
  
      queryString += `
        WHERE rating > $${queryParams.length}
      `;
    }
  }

  queryParams.push(`
    ${limit}
  `);
  queryString += `
    GROUP BY properties.id
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
  `;
  // console.log('queryString: ', queryString);
  // console.log('queryParams: ', queryParams);
  return pool.query(queryString,queryParams)
            .then((response) => {
              // console.log('response.rows: ',response.rows);
              return response.rows;
            })
            .catch((error) => {
              console.error(error.message);
            })


  // const limitedProperties = {};
  // for (let i = 1; i <= limit; i++) {
  //   limitedProperties[i] = properties[i];
  // }
  // return Promise.resolve(limitedProperties);
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
