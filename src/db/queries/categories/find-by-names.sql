SELECT
  id
FROM
  categories
WHERE
  name IN (
    SELECT
      value
    FROM
      json_each(?)
  );
