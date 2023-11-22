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
  const values = [`${email}`];
  
  return pool.query(queryString,values)
            .then((response) => {
              if (response.rows.length > 0) {
                return response.rows[0];
              } else {
                return null;
              }
            })
            .catch((error) => {
              console.error(error.message);
            })
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
  const values = [`${id}`];
  return pool.query(queryString,values)
            .then((response) => {
              if (response.rows.length > 0) {
                return response.rows[0];
              } else {
                return null;
              }
            })
            .catch((error) => {
              console.error(error.message);
            })
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
              if (response.rows.length > 0) {
                return response.rows[0];
              } else {
                return null;
              }
            })
            .catch((error) => {
              console.error(error.message);
            })
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
              if (response.rows.length > 0) {
                return response.rows;
              } else {
                return null;
              }
            })
            .catch((error) => {
              console.error(error.message);
            });
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing following query options.
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

  // search by city
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `
      WHERE city LIKE $${queryParams.length}
    `;
  }

  // search by owner_id
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
      `;
    }
  }

  //search by minimum_price_per_night
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

  // search by maximum_price_per_night
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

  // search by property rating
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

  // limit the search results/pagination
  queryParams.push(`
    ${limit}
  `);
  queryString += `
    GROUP BY properties.id
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
  `;

  return pool.query(queryString,queryParams)
            .then((response) => {
              return response.rows;
            })
            .catch((error) => {
              console.error(error.message);
            });
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {

  const queryString = `
    INSERT INTO properties (owner_id,
                            title,
                            description,
                            thumbnail_photo_url,
                            cover_photo_url,
                            cost_per_night,
                            parking_spaces,
                            number_of_bathrooms,
                            number_of_bedrooms,
                            country,
                            street,
                            city,
                            province,
                            post_code)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *;
  `;

  const queryParams = [`${property.owner_id}`,
                        `${property.title}`,
                        `${property.description}`,
                        `${property.thumbnail_photo_url}`,
                        `${property.cover_photo_url}`,
                        `${property.cost_per_night}`,
                        `${property.parking_spaces}`,
                        `${property.number_of_bathrooms}`,
                        `${property.number_of_bedrooms}`,
                        `${property.country}`,
                        `${property.street}`,
                        `${property.city}`,
                        `${property.province}`,
                        `${property.post_code}`
  ];

  return pool.query(queryString,queryParams)
            .then((response) => {
              return response.rows[0];
            })
            .catch((error) => {
              console.error(error.message);
            });
};


module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
