## Fulcrum Sync PostgreSQL

Sync Fulcrum data to PostgreSQL.

### Installation

```sh
fulcrum install-plugin --url https://github.com/fulcrumapp/fulcrum-sync-postgres
```

### Sync a Form

```sh
# Create a database
./setup-postgres.sh
```

### Sync a Form

```
fulcrum postgres --org 'Fulcrum Account Name'
```

### Keep it up to date

```
fulcrum sync --org 'Fulcrum Account Name'
```
