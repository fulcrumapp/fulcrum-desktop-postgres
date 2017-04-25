## Fulcrum Sync PostgreSQL

Sync Fulcrum data to PostgreSQL.

### Installation

```sh
./run install-plugin --git https://github.com/fulcrumapp/fulcrum-sync-postgres
```

### Sync a Form

```sh
# Create a database
./setup-postgres.sh
```

### Sync a Form

```
./run task carto --org 'Fulcrum Account Name' --form 'Form Name' --apikey 'carto api key' --user 'carto user name'
```
