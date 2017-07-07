echo 'DROP DATABASE fulcrumapp;' | psql $1
echo 'CREATE DATABASE fulcrumapp;' | psql $1
echo 'CREATE EXTENSION postgis;' | psql fulcrumapp
