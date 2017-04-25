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
./run task postgres --org 'Fulcrum Account Name'
```

### Keep it up to date

```
./run sync --org 'Fulcrum Account Name'
```
