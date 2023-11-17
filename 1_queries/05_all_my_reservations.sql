SELECT reservations.id,
       properties.title,
       reservations.start_date,
       properties.cost_per_night,
       AVG(property_reviews.rating)
FROM reservations
LEFT JOIN properties ON reservations.property_id = properties.id
LEFT JOIN property_reviews ON property_reviews.property_id = properties.id
WHERE reservations.guest_id = 1
GROUP BY properties.id, reservations.id
ORDER BY reservations.start_date
LIMIT 10;
