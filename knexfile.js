module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './ferrecotiza.db'
    },
    useNullAsDefault: true,
    migrations: {
      directory: './migrations'
    }
  }
};
