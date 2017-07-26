"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = `
CREATE TABLE IF NOT EXISTS __SCHEMA__.migrations (
  id bigserial NOT NULL,
  text name,
  created_at timestamp with time zone NOT NULL,
  CONSTRAINT migrations_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS __SCHEMA__.audio (
  id bigserial NOT NULL,
  row_id bigint NOT NULL,
  row_resource_id text NOT NULL,
  access_key text NOT NULL,
  record_id bigint,
  record_resource_id text,
  form_id bigint,
  form_resource_id text,
  metadata text,
  file_size bigint,
  created_by_id bigint,
  created_by_resource_id text,
  updated_by_id bigint,
  updated_by_resource_id text,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  file text,
  content_type text,
  is_uploaded boolean NOT NULL DEFAULT FALSE,
  is_stored boolean NOT NULL DEFAULT FALSE,
  is_processed boolean NOT NULL DEFAULT FALSE,
  has_track boolean,
  track text,
  geometry geometry(Geometry, 4326),
  duration double precision,
  bit_rate double precision,
  CONSTRAINT audio_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS __SCHEMA__.changesets (
  id bigserial NOT NULL,
  row_id bigint NOT NULL,
  row_resource_id text NOT NULL,
  form_id bigint NULL,
  form_resource_id text,
  metadata text,
  closed_at timestamp with time zone,
  created_by_id bigint,
  created_by_resource_id text,
  updated_by_id bigint,
  updated_by_resource_id text,
  closed_by_id bigint,
  closed_by_resource_id text,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  min_lat double precision,
  max_lat double precision,
  min_lon double precision,
  max_lon double precision,
  number_of_changes bigint,
  number_of_creates bigint,
  number_of_updates bigint,
  number_of_deletes bigint,
  metadata_index_text text,
  metadata_index tsvector,
  bounding_box geometry(Geometry, 4326),
  CONSTRAINT changesets_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS __SCHEMA__.choice_lists (
  id bigserial NOT NULL,
  row_id bigint NOT NULL,
  row_resource_id text NOT NULL,
  name text NOT NULL,
  description text,
  version bigint NOT NULL,
  items text NOT NULL,
  created_by_id bigint,
  created_by_resource_id text,
  updated_by_id bigint,
  updated_by_resource_id text,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  deleted_at timestamp with time zone,
  CONSTRAINT choice_lists_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS __SCHEMA__.classification_sets (
  id bigserial NOT NULL,
  row_id bigint NOT NULL,
  row_resource_id text NOT NULL,
  name text NOT NULL,
  description text,
  version bigint NOT NULL,
  items text NOT NULL,
  created_by_id bigint,
  created_by_resource_id text,
  updated_by_id bigint,
  updated_by_resource_id text,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  deleted_at timestamp with time zone,
  CONSTRAINT classification_sets_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS __SCHEMA__.forms (
  id bigserial NOT NULL,
  row_id bigint NOT NULL,
  row_resource_id text NOT NULL,
  name text NOT NULL,
  description text,
  version bigint NOT NULL,
  elements text,
  bounding_box geometry(Geometry, 4326),
  record_count bigint NOT NULL DEFAULT 0,
  record_changed_at timestamp with time zone,
  recent_lat_longs text,
  status text,
  status_field text,
  created_by_id bigint,
  created_by_resource_id text,
  updated_by_id bigint,
  updated_by_resource_id text,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  photo_usage bigint,
  photo_count bigint,
  video_usage bigint,
  video_count bigint,
  audio_usage bigint,
  audio_count bigint,
  signature_usage bigint,
  signature_count bigint,
  media_usage bigint,
  media_count bigint,
  auto_assign boolean NOT NULL,
  title_field_keys text,
  hidden_on_dashboard boolean NOT NULL,
  geometry_types text,
  geometry_required boolean NOT NULL,
  script text,
  image text,
  projects_enabled boolean NOT NULL,
  assignment_enabled boolean NOT NULL,
  deleted_at timestamp with time zone,
  CONSTRAINT forms_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS __SCHEMA__.memberships (
  id bigserial NOT NULL,
  row_id bigint NOT NULL,
  row_resource_id text NOT NULL,
  user_resource_id text,
  first_name text,
  last_name text,
  name text,
  email text,
  role_id bigint NOT NULL,
  role_resource_id text NOT NULL,
  status text,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  deleted_at timestamp with time zone,
  CONSTRAINT memberships_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS __SCHEMA__.photos (
  id bigserial NOT NULL,
  row_id bigint NOT NULL,
  row_resource_id text NOT NULL,
  access_key text NOT NULL,
  record_id bigint,
  record_resource_id text,
  form_id bigint,
  form_resource_id text,
  exif text,
  file_size bigint,
  created_by_id bigint,
  created_by_resource_id text,
  updated_by_id bigint,
  updated_by_resource_id text,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  file text,
  content_type text,
  is_uploaded boolean NOT NULL DEFAULT FALSE,
  is_stored boolean NOT NULL DEFAULT FALSE,
  is_processed boolean NOT NULL DEFAULT FALSE,
  geometry geometry(Geometry, 4326),
  latitude double precision,
  longitude double precision,
  altitude double precision,
  accuracy double precision,
  direction double precision,
  width bigint,
  height bigint,
  make text,
  model text,
  software text,
  date_time text,
  CONSTRAINT photos_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS __SCHEMA__.projects (
  id bigserial NOT NULL,
  row_id bigint NOT NULL,
  row_resource_id text NOT NULL,
  name text NOT NULL,
  description text,
  created_by_id bigint,
  created_by_resource_id text,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  deleted_at timestamp with time zone,
  CONSTRAINT projects_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS __SCHEMA__.roles (
  id bigserial NOT NULL,
  row_id bigint NOT NULL,
  row_resource_id text NOT NULL,
  name text NOT NULL,
  description text,
  created_by_id bigint,
  created_by_resource_id text,
  updated_by_id bigint,
  updated_by_resource_id text,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  is_system boolean NOT NULL,
  is_default boolean NOT NULL,
  can_manage_subscription boolean NOT NULL DEFAULT false,
  can_update_organization boolean NOT NULL DEFAULT false,
  can_manage_members boolean NOT NULL DEFAULT false,
  can_manage_roles boolean NOT NULL DEFAULT false,
  can_manage_apps boolean NOT NULL DEFAULT false,
  can_manage_projects boolean NOT NULL DEFAULT false,
  can_manage_choice_lists boolean NOT NULL DEFAULT false,
  can_manage_classification_sets boolean NOT NULL DEFAULT false,
  can_create_records boolean NOT NULL DEFAULT false,
  can_update_records boolean NOT NULL DEFAULT false,
  can_delete_records boolean NOT NULL DEFAULT false,
  can_change_status boolean NOT NULL DEFAULT false,
  can_change_project boolean NOT NULL DEFAULT false,
  can_assign_records boolean NOT NULL DEFAULT false,
  can_import_records boolean NOT NULL DEFAULT false,
  can_export_records boolean NOT NULL DEFAULT false,
  can_run_reports boolean NOT NULL DEFAULT false,
  can_manage_authorizations boolean NOT NULL DEFAULT false,
  deleted_at timestamp with time zone,
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS __SCHEMA__.signatures (
  id bigserial NOT NULL,
  row_id bigint NOT NULL,
  row_resource_id text NOT NULL,
  access_key text NOT NULL,
  record_id bigint,
  record_resource_id text,
  form_id bigint,
  form_resource_id text,
  exif text,
  file_size bigint,
  created_by_id bigint,
  created_by_resource_id text,
  updated_by_id bigint,
  updated_by_resource_id text,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  file text,
  content_type text,
  is_uploaded boolean NOT NULL DEFAULT FALSE,
  is_stored boolean NOT NULL DEFAULT FALSE,
  is_processed boolean NOT NULL DEFAULT FALSE,
  CONSTRAINT signatures_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS __SCHEMA__.videos (
  id bigserial NOT NULL,
  row_id bigint NOT NULL,
  row_resource_id text NOT NULL,
  access_key text NOT NULL,
  record_id bigint,
  record_resource_id text,
  form_id bigint,
  form_resource_id text,
  metadata text,
  file_size bigint,
  created_by_id bigint,
  created_by_resource_id text,
  updated_by_id bigint,
  updated_by_resource_id text,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  file text,
  content_type text,
  is_uploaded boolean NOT NULL DEFAULT FALSE,
  is_stored boolean NOT NULL DEFAULT FALSE,
  is_processed boolean NOT NULL DEFAULT FALSE,
  has_track boolean,
  track text,
  geometry geometry(Geometry, 4326),
  width bigint,
  height bigint,
  duration double precision,
  bit_rate double precision,
  CONSTRAINT videos_pkey PRIMARY KEY (id)
);

DROP VIEW IF EXISTS __VIEW_SCHEMA__.audio_view;

CREATE OR REPLACE VIEW __VIEW_SCHEMA__.audio_view AS
SELECT
  access_key AS audio_id,
  record_resource_id AS record_id,
  form_resource_id AS form_id,
  metadata AS metadata,
  file_size AS file_size,
  created_by_resource_id AS created_by_id,
  updated_by_resource_id AS updated_by_id,
  created_at AS created_at,
  updated_at AS updated_at,
  file AS file,
  content_type AS content_type,
  is_uploaded AS is_uploaded,
  is_stored AS is_stored,
  is_processed AS is_processed,
  has_track AS has_track,
  track AS track,
  geometry AS geometry,
  duration AS duration,
  bit_rate AS bit_rate
FROM __SCHEMA__.audio;

DROP VIEW IF EXISTS __VIEW_SCHEMA__.changesets_view;

CREATE OR REPLACE VIEW __VIEW_SCHEMA__.changesets_view AS
SELECT
  row_resource_id AS changeset_id,
  form_resource_id AS form_id,
  metadata AS metadata,
  closed_at AS closed_at,
  created_by_resource_id AS created_by_id,
  updated_by_resource_id AS updated_by_id,
  closed_by_resource_id AS closed_by_id,
  created_at AS created_at,
  updated_at AS updated_at,
  min_lat AS min_lat,
  max_lat AS max_lat,
  min_lon AS min_lon,
  max_lon AS max_lon,
  number_of_changes AS number_of_changes,
  number_of_creates AS number_of_creates,
  number_of_updates AS number_of_updates,
  number_of_deletes AS number_of_deletes,
  metadata_index AS metadata_index,
  bounding_box AS bounding_box
FROM __SCHEMA__.changesets;

DROP VIEW IF EXISTS __VIEW_SCHEMA__.choice_lists_view;

CREATE OR REPLACE VIEW __VIEW_SCHEMA__.choice_lists_view AS
SELECT
  row_resource_id AS choice_list_id,
  name AS name,
  description AS description,
  version AS version,
  items AS items,
  created_by_resource_id AS created_by_id,
  updated_by_resource_id AS updated_by_id,
  created_at AS created_at,
  updated_at AS updated_at,
  deleted_at AS deleted_at
FROM __SCHEMA__.choice_lists;

DROP VIEW IF EXISTS __VIEW_SCHEMA__.classification_sets_view;

CREATE OR REPLACE VIEW __VIEW_SCHEMA__.classification_sets_view AS
SELECT
  row_resource_id AS classification_set_id,
  name AS name,
  description AS description,
  version AS version,
  items AS items,
  created_by_resource_id AS created_by_id,
  updated_by_resource_id AS updated_by_id,
  created_at AS created_at,
  updated_at AS updated_at,
  deleted_at AS deleted_at
FROM __SCHEMA__.classification_sets;

DROP VIEW IF EXISTS __VIEW_SCHEMA__.forms_view;

CREATE OR REPLACE VIEW __VIEW_SCHEMA__.forms_view AS
SELECT
  row_resource_id AS form_id,
  name AS name,
  description AS description,
  version AS version,
  elements AS elements,
  bounding_box AS bounding_box,
  status AS status,
  status_field AS status_field,
  created_by_resource_id AS created_by_id,
  updated_by_resource_id AS updated_by_id,
  created_at AS created_at,
  updated_at AS updated_at,
  deleted_at AS deleted_at,
  auto_assign AS auto_assign,
  title_field_keys AS title_field_keys,
  hidden_on_dashboard AS hidden_on_dashboard,
  geometry_types AS geometry_types,
  geometry_required AS geometry_required,
  script AS script,
  image AS image,
  projects_enabled AS projects_enabled,
  assignment_enabled AS assignment_enabled
FROM __SCHEMA__.forms;

DROP VIEW IF EXISTS __VIEW_SCHEMA__.memberships_view;

CREATE OR REPLACE VIEW __VIEW_SCHEMA__.memberships_view AS
SELECT
  memberships.row_resource_id AS membership_id,
  memberships.user_resource_id AS user_id,
  memberships.first_name AS first_name,
  memberships.last_name AS last_name,
  memberships.name AS name,
  memberships.email AS email,
  memberships.role_resource_id AS role_id,
  roles.name AS role_name,
  memberships.status AS status,
  memberships.created_at AS created_at,
  memberships.updated_at AS updated_at,
  memberships.deleted_at AS deleted_at
FROM __SCHEMA__.memberships memberships
LEFT OUTER JOIN __SCHEMA__.roles roles ON memberships.role_resource_id = roles.row_resource_id;

DROP VIEW IF EXISTS __VIEW_SCHEMA__.photos_view;

CREATE OR REPLACE VIEW __VIEW_SCHEMA__.photos_view AS
SELECT
  access_key AS photo_id,
  record_resource_id AS record_id,
  form_resource_id AS form_id,
  exif AS exif,
  file_size AS file_size,
  created_by_resource_id AS created_by_id,
  updated_by_resource_id AS updated_by_id,
  created_at AS created_at,
  updated_at AS updated_at,
  file AS file,
  content_type AS content_type,
  is_uploaded AS is_uploaded,
  is_stored AS is_stored,
  is_processed AS is_processed,
  geometry AS geometry,
  latitude AS latitude,
  longitude AS longitude,
  altitude AS altitude,
  accuracy AS accuracy,
  direction AS direction,
  width AS width,
  height AS height,
  make AS make,
  model AS model,
  software AS software,
  date_time AS date_time
FROM __SCHEMA__.photos;

DROP VIEW IF EXISTS __VIEW_SCHEMA__.projects_view;

CREATE OR REPLACE VIEW __VIEW_SCHEMA__.projects_view AS
SELECT
  row_resource_id AS project_id,
  name AS name,
  description AS description,
  created_by_resource_id AS created_by_id,
  created_at AS created_at,
  updated_at AS updated_at,
  deleted_at AS deleted_at
FROM __SCHEMA__.projects;

DROP VIEW IF EXISTS __VIEW_SCHEMA__.roles_view;

CREATE OR REPLACE VIEW __VIEW_SCHEMA__.roles_view AS
SELECT
  row_resource_id AS role_id,
  name AS name,
  description AS description,
  created_by_resource_id AS created_by_id,
  updated_by_resource_id AS updated_by_id,
  created_at AS created_at,
  updated_at AS updated_at,
  deleted_at AS deleted_at,
  is_system AS is_system,
  is_default AS is_default,
  can_manage_subscription AS can_manage_subscription,
  can_update_organization AS can_update_organization,
  can_manage_members AS can_manage_members,
  can_manage_roles AS can_manage_roles,
  can_manage_apps AS can_manage_apps,
  can_manage_projects AS can_manage_projects,
  can_manage_choice_lists AS can_manage_choice_lists,
  can_manage_classification_sets AS can_manage_classification_sets,
  can_create_records AS can_create_records,
  can_update_records AS can_update_records,
  can_delete_records AS can_delete_records,
  can_change_status AS can_change_status,
  can_change_project AS can_change_project,
  can_assign_records AS can_assign_records,
  can_import_records AS can_import_records,
  can_export_records AS can_export_records,
  can_run_reports AS can_run_reports,
  can_manage_authorizations AS can_manage_authorizations
FROM __SCHEMA__.roles;

DROP VIEW IF EXISTS __VIEW_SCHEMA__.signatures_view;

CREATE OR REPLACE VIEW __VIEW_SCHEMA__.signatures_view AS
SELECT
  access_key AS signature_id,
  record_resource_id AS record_id,
  form_resource_id AS form_id,
  file_size AS file_size,
  created_by_resource_id AS created_by_id,
  updated_by_resource_id AS updated_by_id,
  created_at AS created_at,
  updated_at AS updated_at,
  file AS file,
  content_type AS content_type,
  is_uploaded AS is_uploaded,
  is_stored AS is_stored,
  is_processed AS is_processed
FROM __SCHEMA__.signatures;

DROP VIEW IF EXISTS __VIEW_SCHEMA__.videos_view;

CREATE OR REPLACE VIEW __VIEW_SCHEMA__.videos_view AS
SELECT
  access_key AS video_id,
  record_resource_id AS record_id,
  form_resource_id AS form_id,
  metadata AS metadata,
  file_size AS file_size,
  created_by_resource_id AS created_by_id,
  updated_by_resource_id AS updated_by_id,
  created_at AS created_at,
  updated_at AS updated_at,
  file AS file,
  content_type AS content_type,
  is_uploaded AS is_uploaded,
  is_stored AS is_stored,
  is_processed AS is_processed,
  has_track AS has_track,
  track AS track,
  geometry AS geometry,
  width AS width,
  height AS height,
  duration AS duration,
  bit_rate AS bit_rate
FROM __SCHEMA__.videos;

CREATE UNIQUE INDEX idx_audio_row_resource_id ON __SCHEMA__.audio USING btree (row_resource_id);

CREATE UNIQUE INDEX idx_audio_row_id ON __SCHEMA__.audio USING btree (row_id);

CREATE INDEX idx_audio_access_key ON __SCHEMA__.audio USING btree (access_key);

CREATE INDEX idx_audio_record_resource_id ON __SCHEMA__.audio USING btree (record_resource_id);

CREATE INDEX idx_audio_form_resource_id ON __SCHEMA__.audio USING btree (form_resource_id);

CREATE INDEX idx_audio_created_by_resource_id ON __SCHEMA__.audio USING btree (created_by_resource_id);

CREATE INDEX idx_audio_geometry ON __SCHEMA__.audio USING gist (geometry);

CREATE INDEX idx_audio_updated_at ON __SCHEMA__.audio USING btree (updated_at);

CREATE UNIQUE INDEX idx_changesets_row_resource_id ON __SCHEMA__.changesets USING btree (row_resource_id);

CREATE UNIQUE INDEX idx_changesets_row_id ON __SCHEMA__.changesets USING btree (row_id);

CREATE INDEX idx_changesets_form_id ON __SCHEMA__.changesets USING btree (form_id);

CREATE INDEX idx_changesets_metadata_index ON __SCHEMA__.changesets USING gin (metadata_index) WITH (fastupdate = off);

CREATE INDEX idx_changesets_form_id_updated_at ON __SCHEMA__.changesets USING btree (form_id, updated_at);

CREATE INDEX idx_changesets_updated_at ON __SCHEMA__.changesets USING btree (updated_at);

CREATE UNIQUE INDEX idx_choice_lists_row_resource_id ON __SCHEMA__.choice_lists USING btree (row_resource_id);

CREATE UNIQUE INDEX idx_choice_lists_row_id ON __SCHEMA__.choice_lists USING btree (row_id);

CREATE INDEX idx_choice_lists_name ON __SCHEMA__.choice_lists USING btree (name);

CREATE INDEX idx_choice_lists_updated_at ON __SCHEMA__.choice_lists USING btree (updated_at);

CREATE UNIQUE INDEX idx_classification_sets_row_resource_id ON __SCHEMA__.classification_sets USING btree (row_resource_id);

CREATE UNIQUE INDEX idx_classification_sets_row_id ON __SCHEMA__.classification_sets USING btree (row_id);

CREATE INDEX idx_classification_sets_name ON __SCHEMA__.classification_sets USING btree (name);

CREATE INDEX idx_classification_sets_updated_at ON __SCHEMA__.classification_sets USING btree (updated_at);

CREATE UNIQUE INDEX idx_forms_row_resource_id ON __SCHEMA__.forms USING btree (row_resource_id);

CREATE UNIQUE INDEX idx_forms_row_id ON __SCHEMA__.forms USING btree (row_id);

CREATE INDEX idx_forms_name ON __SCHEMA__.forms USING btree (name);

CREATE INDEX idx_forms_updated_at ON __SCHEMA__.forms USING btree (updated_at);

CREATE UNIQUE INDEX idx_memberships_row_resource_id ON __SCHEMA__.memberships USING btree (row_resource_id);

CREATE UNIQUE INDEX idx_memberships_row_id ON __SCHEMA__.memberships USING btree (row_id);

CREATE INDEX idx_memberships_user_resource_id ON __SCHEMA__.memberships USING btree (user_resource_id);

CREATE INDEX idx_memberships_role_resource_id ON __SCHEMA__.memberships USING btree (role_resource_id);

CREATE INDEX idx_memberships_name ON __SCHEMA__.memberships USING btree (name);

CREATE INDEX idx_memberships_updated_at ON __SCHEMA__.memberships USING btree (updated_at);

CREATE UNIQUE INDEX idx_photos_row_resource_id ON __SCHEMA__.photos USING btree (row_resource_id);

CREATE UNIQUE INDEX idx_photos_row_id ON __SCHEMA__.photos USING btree (row_id);

CREATE INDEX idx_photos_access_key ON __SCHEMA__.photos USING btree (access_key);

CREATE INDEX idx_photos_record_resource_id ON __SCHEMA__.photos USING btree (record_resource_id);

CREATE INDEX idx_photos_form_resource_id ON __SCHEMA__.photos USING btree (form_resource_id);

CREATE INDEX idx_photos_created_by_resource_id ON __SCHEMA__.photos USING btree (created_by_resource_id);

CREATE INDEX idx_photos_geometry ON __SCHEMA__.photos USING gist (geometry);

CREATE INDEX idx_photos_updated_at ON __SCHEMA__.photos USING btree (updated_at);

CREATE UNIQUE INDEX idx_projects_row_resource_id ON __SCHEMA__.projects USING btree (row_resource_id);

CREATE UNIQUE INDEX idx_projects_row_id ON __SCHEMA__.projects USING btree (row_id);

CREATE INDEX idx_projects_name ON __SCHEMA__.projects USING btree (name);

CREATE INDEX idx_projects_updated_at ON __SCHEMA__.projects USING btree (updated_at);

CREATE UNIQUE INDEX idx_roles_row_resource_id ON __SCHEMA__.roles USING btree (row_resource_id);

CREATE UNIQUE INDEX idx_roles_row_id ON __SCHEMA__.roles USING btree (row_id);

CREATE INDEX idx_roles_name ON __SCHEMA__.roles USING btree (name);

CREATE INDEX idx_roles_updated_at ON __SCHEMA__.roles USING btree (updated_at);

CREATE UNIQUE INDEX idx_signatures_row_resource_id ON __SCHEMA__.signatures USING btree (row_resource_id);

CREATE UNIQUE INDEX idx_signatures_row_id ON __SCHEMA__.signatures USING btree (row_id);

CREATE INDEX idx_signatures_access_key ON __SCHEMA__.signatures USING btree (access_key);

CREATE INDEX idx_signatures_record_resource_id ON __SCHEMA__.signatures USING btree (record_resource_id);

CREATE INDEX idx_signatures_form_resource_id ON __SCHEMA__.signatures USING btree (form_resource_id);

CREATE INDEX idx_signatures_created_by_resource_id ON __SCHEMA__.signatures USING btree (created_by_resource_id);

CREATE INDEX idx_signatures_updated_at ON __SCHEMA__.signatures USING btree (updated_at);

CREATE UNIQUE INDEX idx_videos_row_resource_id ON __SCHEMA__.videos USING btree (row_resource_id);

CREATE UNIQUE INDEX idx_videos_row_id ON __SCHEMA__.videos USING btree (row_id);

CREATE INDEX idx_videos_access_key ON __SCHEMA__.videos USING btree (access_key);

CREATE INDEX idx_videos_record_resource_id ON __SCHEMA__.videos USING btree (record_resource_id);

CREATE INDEX idx_videos_form_resource_id ON __SCHEMA__.videos USING btree (form_resource_id);

CREATE INDEX idx_videos_created_by_resource_id ON __SCHEMA__.videos USING btree (created_by_resource_id);

CREATE INDEX idx_videos_geometry ON __SCHEMA__.videos USING gist (geometry);

CREATE INDEX idx_videos_updated_at ON __SCHEMA__.videos USING btree (updated_at);
`;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3RlbXBsYXRlLnNxbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztrQkFBZ0IiLCJmaWxlIjoidGVtcGxhdGUuc3FsLmpzIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGRlZmF1bHQgYFxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgX19TQ0hFTUFfXy5taWdyYXRpb25zIChcbiAgaWQgYmlnc2VyaWFsIE5PVCBOVUxMLFxuICB0ZXh0IG5hbWUsXG4gIGNyZWF0ZWRfYXQgdGltZXN0YW1wIHdpdGggdGltZSB6b25lIE5PVCBOVUxMLFxuICBDT05TVFJBSU5UIG1pZ3JhdGlvbnNfcGtleSBQUklNQVJZIEtFWSAoaWQpXG4pO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBfX1NDSEVNQV9fLmF1ZGlvIChcbiAgaWQgYmlnc2VyaWFsIE5PVCBOVUxMLFxuICByb3dfaWQgYmlnaW50IE5PVCBOVUxMLFxuICByb3dfcmVzb3VyY2VfaWQgdGV4dCBOT1QgTlVMTCxcbiAgYWNjZXNzX2tleSB0ZXh0IE5PVCBOVUxMLFxuICByZWNvcmRfaWQgYmlnaW50LFxuICByZWNvcmRfcmVzb3VyY2VfaWQgdGV4dCxcbiAgZm9ybV9pZCBiaWdpbnQsXG4gIGZvcm1fcmVzb3VyY2VfaWQgdGV4dCxcbiAgbWV0YWRhdGEgdGV4dCxcbiAgZmlsZV9zaXplIGJpZ2ludCxcbiAgY3JlYXRlZF9ieV9pZCBiaWdpbnQsXG4gIGNyZWF0ZWRfYnlfcmVzb3VyY2VfaWQgdGV4dCxcbiAgdXBkYXRlZF9ieV9pZCBiaWdpbnQsXG4gIHVwZGF0ZWRfYnlfcmVzb3VyY2VfaWQgdGV4dCxcbiAgY3JlYXRlZF9hdCB0aW1lc3RhbXAgd2l0aCB0aW1lIHpvbmUgTk9UIE5VTEwsXG4gIHVwZGF0ZWRfYXQgdGltZXN0YW1wIHdpdGggdGltZSB6b25lIE5PVCBOVUxMLFxuICBmaWxlIHRleHQsXG4gIGNvbnRlbnRfdHlwZSB0ZXh0LFxuICBpc191cGxvYWRlZCBib29sZWFuIE5PVCBOVUxMIERFRkFVTFQgRkFMU0UsXG4gIGlzX3N0b3JlZCBib29sZWFuIE5PVCBOVUxMIERFRkFVTFQgRkFMU0UsXG4gIGlzX3Byb2Nlc3NlZCBib29sZWFuIE5PVCBOVUxMIERFRkFVTFQgRkFMU0UsXG4gIGhhc190cmFjayBib29sZWFuLFxuICB0cmFjayB0ZXh0LFxuICBnZW9tZXRyeSBnZW9tZXRyeShHZW9tZXRyeSwgNDMyNiksXG4gIGR1cmF0aW9uIGRvdWJsZSBwcmVjaXNpb24sXG4gIGJpdF9yYXRlIGRvdWJsZSBwcmVjaXNpb24sXG4gIENPTlNUUkFJTlQgYXVkaW9fcGtleSBQUklNQVJZIEtFWSAoaWQpXG4pO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBfX1NDSEVNQV9fLmNoYW5nZXNldHMgKFxuICBpZCBiaWdzZXJpYWwgTk9UIE5VTEwsXG4gIHJvd19pZCBiaWdpbnQgTk9UIE5VTEwsXG4gIHJvd19yZXNvdXJjZV9pZCB0ZXh0IE5PVCBOVUxMLFxuICBmb3JtX2lkIGJpZ2ludCBOVUxMLFxuICBmb3JtX3Jlc291cmNlX2lkIHRleHQsXG4gIG1ldGFkYXRhIHRleHQsXG4gIGNsb3NlZF9hdCB0aW1lc3RhbXAgd2l0aCB0aW1lIHpvbmUsXG4gIGNyZWF0ZWRfYnlfaWQgYmlnaW50LFxuICBjcmVhdGVkX2J5X3Jlc291cmNlX2lkIHRleHQsXG4gIHVwZGF0ZWRfYnlfaWQgYmlnaW50LFxuICB1cGRhdGVkX2J5X3Jlc291cmNlX2lkIHRleHQsXG4gIGNsb3NlZF9ieV9pZCBiaWdpbnQsXG4gIGNsb3NlZF9ieV9yZXNvdXJjZV9pZCB0ZXh0LFxuICBjcmVhdGVkX2F0IHRpbWVzdGFtcCB3aXRoIHRpbWUgem9uZSBOT1QgTlVMTCxcbiAgdXBkYXRlZF9hdCB0aW1lc3RhbXAgd2l0aCB0aW1lIHpvbmUgTk9UIE5VTEwsXG4gIG1pbl9sYXQgZG91YmxlIHByZWNpc2lvbixcbiAgbWF4X2xhdCBkb3VibGUgcHJlY2lzaW9uLFxuICBtaW5fbG9uIGRvdWJsZSBwcmVjaXNpb24sXG4gIG1heF9sb24gZG91YmxlIHByZWNpc2lvbixcbiAgbnVtYmVyX29mX2NoYW5nZXMgYmlnaW50LFxuICBudW1iZXJfb2ZfY3JlYXRlcyBiaWdpbnQsXG4gIG51bWJlcl9vZl91cGRhdGVzIGJpZ2ludCxcbiAgbnVtYmVyX29mX2RlbGV0ZXMgYmlnaW50LFxuICBtZXRhZGF0YV9pbmRleF90ZXh0IHRleHQsXG4gIG1ldGFkYXRhX2luZGV4IHRzdmVjdG9yLFxuICBib3VuZGluZ19ib3ggZ2VvbWV0cnkoR2VvbWV0cnksIDQzMjYpLFxuICBDT05TVFJBSU5UIGNoYW5nZXNldHNfcGtleSBQUklNQVJZIEtFWSAoaWQpXG4pO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBfX1NDSEVNQV9fLmNob2ljZV9saXN0cyAoXG4gIGlkIGJpZ3NlcmlhbCBOT1QgTlVMTCxcbiAgcm93X2lkIGJpZ2ludCBOT1QgTlVMTCxcbiAgcm93X3Jlc291cmNlX2lkIHRleHQgTk9UIE5VTEwsXG4gIG5hbWUgdGV4dCBOT1QgTlVMTCxcbiAgZGVzY3JpcHRpb24gdGV4dCxcbiAgdmVyc2lvbiBiaWdpbnQgTk9UIE5VTEwsXG4gIGl0ZW1zIHRleHQgTk9UIE5VTEwsXG4gIGNyZWF0ZWRfYnlfaWQgYmlnaW50LFxuICBjcmVhdGVkX2J5X3Jlc291cmNlX2lkIHRleHQsXG4gIHVwZGF0ZWRfYnlfaWQgYmlnaW50LFxuICB1cGRhdGVkX2J5X3Jlc291cmNlX2lkIHRleHQsXG4gIGNyZWF0ZWRfYXQgdGltZXN0YW1wIHdpdGggdGltZSB6b25lIE5PVCBOVUxMLFxuICB1cGRhdGVkX2F0IHRpbWVzdGFtcCB3aXRoIHRpbWUgem9uZSBOT1QgTlVMTCxcbiAgZGVsZXRlZF9hdCB0aW1lc3RhbXAgd2l0aCB0aW1lIHpvbmUsXG4gIENPTlNUUkFJTlQgY2hvaWNlX2xpc3RzX3BrZXkgUFJJTUFSWSBLRVkgKGlkKVxuKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgX19TQ0hFTUFfXy5jbGFzc2lmaWNhdGlvbl9zZXRzIChcbiAgaWQgYmlnc2VyaWFsIE5PVCBOVUxMLFxuICByb3dfaWQgYmlnaW50IE5PVCBOVUxMLFxuICByb3dfcmVzb3VyY2VfaWQgdGV4dCBOT1QgTlVMTCxcbiAgbmFtZSB0ZXh0IE5PVCBOVUxMLFxuICBkZXNjcmlwdGlvbiB0ZXh0LFxuICB2ZXJzaW9uIGJpZ2ludCBOT1QgTlVMTCxcbiAgaXRlbXMgdGV4dCBOT1QgTlVMTCxcbiAgY3JlYXRlZF9ieV9pZCBiaWdpbnQsXG4gIGNyZWF0ZWRfYnlfcmVzb3VyY2VfaWQgdGV4dCxcbiAgdXBkYXRlZF9ieV9pZCBiaWdpbnQsXG4gIHVwZGF0ZWRfYnlfcmVzb3VyY2VfaWQgdGV4dCxcbiAgY3JlYXRlZF9hdCB0aW1lc3RhbXAgd2l0aCB0aW1lIHpvbmUgTk9UIE5VTEwsXG4gIHVwZGF0ZWRfYXQgdGltZXN0YW1wIHdpdGggdGltZSB6b25lIE5PVCBOVUxMLFxuICBkZWxldGVkX2F0IHRpbWVzdGFtcCB3aXRoIHRpbWUgem9uZSxcbiAgQ09OU1RSQUlOVCBjbGFzc2lmaWNhdGlvbl9zZXRzX3BrZXkgUFJJTUFSWSBLRVkgKGlkKVxuKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgX19TQ0hFTUFfXy5mb3JtcyAoXG4gIGlkIGJpZ3NlcmlhbCBOT1QgTlVMTCxcbiAgcm93X2lkIGJpZ2ludCBOT1QgTlVMTCxcbiAgcm93X3Jlc291cmNlX2lkIHRleHQgTk9UIE5VTEwsXG4gIG5hbWUgdGV4dCBOT1QgTlVMTCxcbiAgZGVzY3JpcHRpb24gdGV4dCxcbiAgdmVyc2lvbiBiaWdpbnQgTk9UIE5VTEwsXG4gIGVsZW1lbnRzIHRleHQsXG4gIGJvdW5kaW5nX2JveCBnZW9tZXRyeShHZW9tZXRyeSwgNDMyNiksXG4gIHJlY29yZF9jb3VudCBiaWdpbnQgTk9UIE5VTEwgREVGQVVMVCAwLFxuICByZWNvcmRfY2hhbmdlZF9hdCB0aW1lc3RhbXAgd2l0aCB0aW1lIHpvbmUsXG4gIHJlY2VudF9sYXRfbG9uZ3MgdGV4dCxcbiAgc3RhdHVzIHRleHQsXG4gIHN0YXR1c19maWVsZCB0ZXh0LFxuICBjcmVhdGVkX2J5X2lkIGJpZ2ludCxcbiAgY3JlYXRlZF9ieV9yZXNvdXJjZV9pZCB0ZXh0LFxuICB1cGRhdGVkX2J5X2lkIGJpZ2ludCxcbiAgdXBkYXRlZF9ieV9yZXNvdXJjZV9pZCB0ZXh0LFxuICBjcmVhdGVkX2F0IHRpbWVzdGFtcCB3aXRoIHRpbWUgem9uZSBOT1QgTlVMTCxcbiAgdXBkYXRlZF9hdCB0aW1lc3RhbXAgd2l0aCB0aW1lIHpvbmUgTk9UIE5VTEwsXG4gIHBob3RvX3VzYWdlIGJpZ2ludCxcbiAgcGhvdG9fY291bnQgYmlnaW50LFxuICB2aWRlb191c2FnZSBiaWdpbnQsXG4gIHZpZGVvX2NvdW50IGJpZ2ludCxcbiAgYXVkaW9fdXNhZ2UgYmlnaW50LFxuICBhdWRpb19jb3VudCBiaWdpbnQsXG4gIHNpZ25hdHVyZV91c2FnZSBiaWdpbnQsXG4gIHNpZ25hdHVyZV9jb3VudCBiaWdpbnQsXG4gIG1lZGlhX3VzYWdlIGJpZ2ludCxcbiAgbWVkaWFfY291bnQgYmlnaW50LFxuICBhdXRvX2Fzc2lnbiBib29sZWFuIE5PVCBOVUxMLFxuICB0aXRsZV9maWVsZF9rZXlzIHRleHQsXG4gIGhpZGRlbl9vbl9kYXNoYm9hcmQgYm9vbGVhbiBOT1QgTlVMTCxcbiAgZ2VvbWV0cnlfdHlwZXMgdGV4dCxcbiAgZ2VvbWV0cnlfcmVxdWlyZWQgYm9vbGVhbiBOT1QgTlVMTCxcbiAgc2NyaXB0IHRleHQsXG4gIGltYWdlIHRleHQsXG4gIHByb2plY3RzX2VuYWJsZWQgYm9vbGVhbiBOT1QgTlVMTCxcbiAgYXNzaWdubWVudF9lbmFibGVkIGJvb2xlYW4gTk9UIE5VTEwsXG4gIGRlbGV0ZWRfYXQgdGltZXN0YW1wIHdpdGggdGltZSB6b25lLFxuICBDT05TVFJBSU5UIGZvcm1zX3BrZXkgUFJJTUFSWSBLRVkgKGlkKVxuKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgX19TQ0hFTUFfXy5tZW1iZXJzaGlwcyAoXG4gIGlkIGJpZ3NlcmlhbCBOT1QgTlVMTCxcbiAgcm93X2lkIGJpZ2ludCBOT1QgTlVMTCxcbiAgcm93X3Jlc291cmNlX2lkIHRleHQgTk9UIE5VTEwsXG4gIHVzZXJfcmVzb3VyY2VfaWQgdGV4dCxcbiAgZmlyc3RfbmFtZSB0ZXh0LFxuICBsYXN0X25hbWUgdGV4dCxcbiAgbmFtZSB0ZXh0LFxuICBlbWFpbCB0ZXh0LFxuICByb2xlX2lkIGJpZ2ludCBOT1QgTlVMTCxcbiAgcm9sZV9yZXNvdXJjZV9pZCB0ZXh0IE5PVCBOVUxMLFxuICBzdGF0dXMgdGV4dCxcbiAgY3JlYXRlZF9hdCB0aW1lc3RhbXAgd2l0aCB0aW1lIHpvbmUgTk9UIE5VTEwsXG4gIHVwZGF0ZWRfYXQgdGltZXN0YW1wIHdpdGggdGltZSB6b25lIE5PVCBOVUxMLFxuICBkZWxldGVkX2F0IHRpbWVzdGFtcCB3aXRoIHRpbWUgem9uZSxcbiAgQ09OU1RSQUlOVCBtZW1iZXJzaGlwc19wa2V5IFBSSU1BUlkgS0VZIChpZClcbik7XG5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIF9fU0NIRU1BX18ucGhvdG9zIChcbiAgaWQgYmlnc2VyaWFsIE5PVCBOVUxMLFxuICByb3dfaWQgYmlnaW50IE5PVCBOVUxMLFxuICByb3dfcmVzb3VyY2VfaWQgdGV4dCBOT1QgTlVMTCxcbiAgYWNjZXNzX2tleSB0ZXh0IE5PVCBOVUxMLFxuICByZWNvcmRfaWQgYmlnaW50LFxuICByZWNvcmRfcmVzb3VyY2VfaWQgdGV4dCxcbiAgZm9ybV9pZCBiaWdpbnQsXG4gIGZvcm1fcmVzb3VyY2VfaWQgdGV4dCxcbiAgZXhpZiB0ZXh0LFxuICBmaWxlX3NpemUgYmlnaW50LFxuICBjcmVhdGVkX2J5X2lkIGJpZ2ludCxcbiAgY3JlYXRlZF9ieV9yZXNvdXJjZV9pZCB0ZXh0LFxuICB1cGRhdGVkX2J5X2lkIGJpZ2ludCxcbiAgdXBkYXRlZF9ieV9yZXNvdXJjZV9pZCB0ZXh0LFxuICBjcmVhdGVkX2F0IHRpbWVzdGFtcCB3aXRoIHRpbWUgem9uZSBOT1QgTlVMTCxcbiAgdXBkYXRlZF9hdCB0aW1lc3RhbXAgd2l0aCB0aW1lIHpvbmUgTk9UIE5VTEwsXG4gIGZpbGUgdGV4dCxcbiAgY29udGVudF90eXBlIHRleHQsXG4gIGlzX3VwbG9hZGVkIGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBGQUxTRSxcbiAgaXNfc3RvcmVkIGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBGQUxTRSxcbiAgaXNfcHJvY2Vzc2VkIGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBGQUxTRSxcbiAgZ2VvbWV0cnkgZ2VvbWV0cnkoR2VvbWV0cnksIDQzMjYpLFxuICBsYXRpdHVkZSBkb3VibGUgcHJlY2lzaW9uLFxuICBsb25naXR1ZGUgZG91YmxlIHByZWNpc2lvbixcbiAgYWx0aXR1ZGUgZG91YmxlIHByZWNpc2lvbixcbiAgYWNjdXJhY3kgZG91YmxlIHByZWNpc2lvbixcbiAgZGlyZWN0aW9uIGRvdWJsZSBwcmVjaXNpb24sXG4gIHdpZHRoIGJpZ2ludCxcbiAgaGVpZ2h0IGJpZ2ludCxcbiAgbWFrZSB0ZXh0LFxuICBtb2RlbCB0ZXh0LFxuICBzb2Z0d2FyZSB0ZXh0LFxuICBkYXRlX3RpbWUgdGV4dCxcbiAgQ09OU1RSQUlOVCBwaG90b3NfcGtleSBQUklNQVJZIEtFWSAoaWQpXG4pO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBfX1NDSEVNQV9fLnByb2plY3RzIChcbiAgaWQgYmlnc2VyaWFsIE5PVCBOVUxMLFxuICByb3dfaWQgYmlnaW50IE5PVCBOVUxMLFxuICByb3dfcmVzb3VyY2VfaWQgdGV4dCBOT1QgTlVMTCxcbiAgbmFtZSB0ZXh0IE5PVCBOVUxMLFxuICBkZXNjcmlwdGlvbiB0ZXh0LFxuICBjcmVhdGVkX2J5X2lkIGJpZ2ludCxcbiAgY3JlYXRlZF9ieV9yZXNvdXJjZV9pZCB0ZXh0LFxuICBjcmVhdGVkX2F0IHRpbWVzdGFtcCB3aXRoIHRpbWUgem9uZSBOT1QgTlVMTCxcbiAgdXBkYXRlZF9hdCB0aW1lc3RhbXAgd2l0aCB0aW1lIHpvbmUgTk9UIE5VTEwsXG4gIGRlbGV0ZWRfYXQgdGltZXN0YW1wIHdpdGggdGltZSB6b25lLFxuICBDT05TVFJBSU5UIHByb2plY3RzX3BrZXkgUFJJTUFSWSBLRVkgKGlkKVxuKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgX19TQ0hFTUFfXy5yb2xlcyAoXG4gIGlkIGJpZ3NlcmlhbCBOT1QgTlVMTCxcbiAgcm93X2lkIGJpZ2ludCBOT1QgTlVMTCxcbiAgcm93X3Jlc291cmNlX2lkIHRleHQgTk9UIE5VTEwsXG4gIG5hbWUgdGV4dCBOT1QgTlVMTCxcbiAgZGVzY3JpcHRpb24gdGV4dCxcbiAgY3JlYXRlZF9ieV9pZCBiaWdpbnQsXG4gIGNyZWF0ZWRfYnlfcmVzb3VyY2VfaWQgdGV4dCxcbiAgdXBkYXRlZF9ieV9pZCBiaWdpbnQsXG4gIHVwZGF0ZWRfYnlfcmVzb3VyY2VfaWQgdGV4dCxcbiAgY3JlYXRlZF9hdCB0aW1lc3RhbXAgd2l0aCB0aW1lIHpvbmUgTk9UIE5VTEwsXG4gIHVwZGF0ZWRfYXQgdGltZXN0YW1wIHdpdGggdGltZSB6b25lIE5PVCBOVUxMLFxuICBpc19zeXN0ZW0gYm9vbGVhbiBOT1QgTlVMTCxcbiAgaXNfZGVmYXVsdCBib29sZWFuIE5PVCBOVUxMLFxuICBjYW5fbWFuYWdlX3N1YnNjcmlwdGlvbiBib29sZWFuIE5PVCBOVUxMIERFRkFVTFQgZmFsc2UsXG4gIGNhbl91cGRhdGVfb3JnYW5pemF0aW9uIGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBmYWxzZSxcbiAgY2FuX21hbmFnZV9tZW1iZXJzIGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBmYWxzZSxcbiAgY2FuX21hbmFnZV9yb2xlcyBib29sZWFuIE5PVCBOVUxMIERFRkFVTFQgZmFsc2UsXG4gIGNhbl9tYW5hZ2VfYXBwcyBib29sZWFuIE5PVCBOVUxMIERFRkFVTFQgZmFsc2UsXG4gIGNhbl9tYW5hZ2VfcHJvamVjdHMgYm9vbGVhbiBOT1QgTlVMTCBERUZBVUxUIGZhbHNlLFxuICBjYW5fbWFuYWdlX2Nob2ljZV9saXN0cyBib29sZWFuIE5PVCBOVUxMIERFRkFVTFQgZmFsc2UsXG4gIGNhbl9tYW5hZ2VfY2xhc3NpZmljYXRpb25fc2V0cyBib29sZWFuIE5PVCBOVUxMIERFRkFVTFQgZmFsc2UsXG4gIGNhbl9jcmVhdGVfcmVjb3JkcyBib29sZWFuIE5PVCBOVUxMIERFRkFVTFQgZmFsc2UsXG4gIGNhbl91cGRhdGVfcmVjb3JkcyBib29sZWFuIE5PVCBOVUxMIERFRkFVTFQgZmFsc2UsXG4gIGNhbl9kZWxldGVfcmVjb3JkcyBib29sZWFuIE5PVCBOVUxMIERFRkFVTFQgZmFsc2UsXG4gIGNhbl9jaGFuZ2Vfc3RhdHVzIGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBmYWxzZSxcbiAgY2FuX2NoYW5nZV9wcm9qZWN0IGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBmYWxzZSxcbiAgY2FuX2Fzc2lnbl9yZWNvcmRzIGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBmYWxzZSxcbiAgY2FuX2ltcG9ydF9yZWNvcmRzIGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBmYWxzZSxcbiAgY2FuX2V4cG9ydF9yZWNvcmRzIGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBmYWxzZSxcbiAgY2FuX3J1bl9yZXBvcnRzIGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBmYWxzZSxcbiAgY2FuX21hbmFnZV9hdXRob3JpemF0aW9ucyBib29sZWFuIE5PVCBOVUxMIERFRkFVTFQgZmFsc2UsXG4gIGRlbGV0ZWRfYXQgdGltZXN0YW1wIHdpdGggdGltZSB6b25lLFxuICBDT05TVFJBSU5UIHJvbGVzX3BrZXkgUFJJTUFSWSBLRVkgKGlkKVxuKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgX19TQ0hFTUFfXy5zaWduYXR1cmVzIChcbiAgaWQgYmlnc2VyaWFsIE5PVCBOVUxMLFxuICByb3dfaWQgYmlnaW50IE5PVCBOVUxMLFxuICByb3dfcmVzb3VyY2VfaWQgdGV4dCBOT1QgTlVMTCxcbiAgYWNjZXNzX2tleSB0ZXh0IE5PVCBOVUxMLFxuICByZWNvcmRfaWQgYmlnaW50LFxuICByZWNvcmRfcmVzb3VyY2VfaWQgdGV4dCxcbiAgZm9ybV9pZCBiaWdpbnQsXG4gIGZvcm1fcmVzb3VyY2VfaWQgdGV4dCxcbiAgZXhpZiB0ZXh0LFxuICBmaWxlX3NpemUgYmlnaW50LFxuICBjcmVhdGVkX2J5X2lkIGJpZ2ludCxcbiAgY3JlYXRlZF9ieV9yZXNvdXJjZV9pZCB0ZXh0LFxuICB1cGRhdGVkX2J5X2lkIGJpZ2ludCxcbiAgdXBkYXRlZF9ieV9yZXNvdXJjZV9pZCB0ZXh0LFxuICBjcmVhdGVkX2F0IHRpbWVzdGFtcCB3aXRoIHRpbWUgem9uZSBOT1QgTlVMTCxcbiAgdXBkYXRlZF9hdCB0aW1lc3RhbXAgd2l0aCB0aW1lIHpvbmUgTk9UIE5VTEwsXG4gIGZpbGUgdGV4dCxcbiAgY29udGVudF90eXBlIHRleHQsXG4gIGlzX3VwbG9hZGVkIGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBGQUxTRSxcbiAgaXNfc3RvcmVkIGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBGQUxTRSxcbiAgaXNfcHJvY2Vzc2VkIGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBGQUxTRSxcbiAgQ09OU1RSQUlOVCBzaWduYXR1cmVzX3BrZXkgUFJJTUFSWSBLRVkgKGlkKVxuKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgX19TQ0hFTUFfXy52aWRlb3MgKFxuICBpZCBiaWdzZXJpYWwgTk9UIE5VTEwsXG4gIHJvd19pZCBiaWdpbnQgTk9UIE5VTEwsXG4gIHJvd19yZXNvdXJjZV9pZCB0ZXh0IE5PVCBOVUxMLFxuICBhY2Nlc3Nfa2V5IHRleHQgTk9UIE5VTEwsXG4gIHJlY29yZF9pZCBiaWdpbnQsXG4gIHJlY29yZF9yZXNvdXJjZV9pZCB0ZXh0LFxuICBmb3JtX2lkIGJpZ2ludCxcbiAgZm9ybV9yZXNvdXJjZV9pZCB0ZXh0LFxuICBtZXRhZGF0YSB0ZXh0LFxuICBmaWxlX3NpemUgYmlnaW50LFxuICBjcmVhdGVkX2J5X2lkIGJpZ2ludCxcbiAgY3JlYXRlZF9ieV9yZXNvdXJjZV9pZCB0ZXh0LFxuICB1cGRhdGVkX2J5X2lkIGJpZ2ludCxcbiAgdXBkYXRlZF9ieV9yZXNvdXJjZV9pZCB0ZXh0LFxuICBjcmVhdGVkX2F0IHRpbWVzdGFtcCB3aXRoIHRpbWUgem9uZSBOT1QgTlVMTCxcbiAgdXBkYXRlZF9hdCB0aW1lc3RhbXAgd2l0aCB0aW1lIHpvbmUgTk9UIE5VTEwsXG4gIGZpbGUgdGV4dCxcbiAgY29udGVudF90eXBlIHRleHQsXG4gIGlzX3VwbG9hZGVkIGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBGQUxTRSxcbiAgaXNfc3RvcmVkIGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBGQUxTRSxcbiAgaXNfcHJvY2Vzc2VkIGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBGQUxTRSxcbiAgaGFzX3RyYWNrIGJvb2xlYW4sXG4gIHRyYWNrIHRleHQsXG4gIGdlb21ldHJ5IGdlb21ldHJ5KEdlb21ldHJ5LCA0MzI2KSxcbiAgd2lkdGggYmlnaW50LFxuICBoZWlnaHQgYmlnaW50LFxuICBkdXJhdGlvbiBkb3VibGUgcHJlY2lzaW9uLFxuICBiaXRfcmF0ZSBkb3VibGUgcHJlY2lzaW9uLFxuICBDT05TVFJBSU5UIHZpZGVvc19wa2V5IFBSSU1BUlkgS0VZIChpZClcbik7XG5cbkRST1AgVklFVyBJRiBFWElTVFMgX19WSUVXX1NDSEVNQV9fLmF1ZGlvX3ZpZXc7XG5cbkNSRUFURSBPUiBSRVBMQUNFIFZJRVcgX19WSUVXX1NDSEVNQV9fLmF1ZGlvX3ZpZXcgQVNcblNFTEVDVFxuICBhY2Nlc3Nfa2V5IEFTIGF1ZGlvX2lkLFxuICByZWNvcmRfcmVzb3VyY2VfaWQgQVMgcmVjb3JkX2lkLFxuICBmb3JtX3Jlc291cmNlX2lkIEFTIGZvcm1faWQsXG4gIG1ldGFkYXRhIEFTIG1ldGFkYXRhLFxuICBmaWxlX3NpemUgQVMgZmlsZV9zaXplLFxuICBjcmVhdGVkX2J5X3Jlc291cmNlX2lkIEFTIGNyZWF0ZWRfYnlfaWQsXG4gIHVwZGF0ZWRfYnlfcmVzb3VyY2VfaWQgQVMgdXBkYXRlZF9ieV9pZCxcbiAgY3JlYXRlZF9hdCBBUyBjcmVhdGVkX2F0LFxuICB1cGRhdGVkX2F0IEFTIHVwZGF0ZWRfYXQsXG4gIGZpbGUgQVMgZmlsZSxcbiAgY29udGVudF90eXBlIEFTIGNvbnRlbnRfdHlwZSxcbiAgaXNfdXBsb2FkZWQgQVMgaXNfdXBsb2FkZWQsXG4gIGlzX3N0b3JlZCBBUyBpc19zdG9yZWQsXG4gIGlzX3Byb2Nlc3NlZCBBUyBpc19wcm9jZXNzZWQsXG4gIGhhc190cmFjayBBUyBoYXNfdHJhY2ssXG4gIHRyYWNrIEFTIHRyYWNrLFxuICBnZW9tZXRyeSBBUyBnZW9tZXRyeSxcbiAgZHVyYXRpb24gQVMgZHVyYXRpb24sXG4gIGJpdF9yYXRlIEFTIGJpdF9yYXRlXG5GUk9NIF9fU0NIRU1BX18uYXVkaW87XG5cbkRST1AgVklFVyBJRiBFWElTVFMgX19WSUVXX1NDSEVNQV9fLmNoYW5nZXNldHNfdmlldztcblxuQ1JFQVRFIE9SIFJFUExBQ0UgVklFVyBfX1ZJRVdfU0NIRU1BX18uY2hhbmdlc2V0c192aWV3IEFTXG5TRUxFQ1RcbiAgcm93X3Jlc291cmNlX2lkIEFTIGNoYW5nZXNldF9pZCxcbiAgZm9ybV9yZXNvdXJjZV9pZCBBUyBmb3JtX2lkLFxuICBtZXRhZGF0YSBBUyBtZXRhZGF0YSxcbiAgY2xvc2VkX2F0IEFTIGNsb3NlZF9hdCxcbiAgY3JlYXRlZF9ieV9yZXNvdXJjZV9pZCBBUyBjcmVhdGVkX2J5X2lkLFxuICB1cGRhdGVkX2J5X3Jlc291cmNlX2lkIEFTIHVwZGF0ZWRfYnlfaWQsXG4gIGNsb3NlZF9ieV9yZXNvdXJjZV9pZCBBUyBjbG9zZWRfYnlfaWQsXG4gIGNyZWF0ZWRfYXQgQVMgY3JlYXRlZF9hdCxcbiAgdXBkYXRlZF9hdCBBUyB1cGRhdGVkX2F0LFxuICBtaW5fbGF0IEFTIG1pbl9sYXQsXG4gIG1heF9sYXQgQVMgbWF4X2xhdCxcbiAgbWluX2xvbiBBUyBtaW5fbG9uLFxuICBtYXhfbG9uIEFTIG1heF9sb24sXG4gIG51bWJlcl9vZl9jaGFuZ2VzIEFTIG51bWJlcl9vZl9jaGFuZ2VzLFxuICBudW1iZXJfb2ZfY3JlYXRlcyBBUyBudW1iZXJfb2ZfY3JlYXRlcyxcbiAgbnVtYmVyX29mX3VwZGF0ZXMgQVMgbnVtYmVyX29mX3VwZGF0ZXMsXG4gIG51bWJlcl9vZl9kZWxldGVzIEFTIG51bWJlcl9vZl9kZWxldGVzLFxuICBtZXRhZGF0YV9pbmRleCBBUyBtZXRhZGF0YV9pbmRleCxcbiAgYm91bmRpbmdfYm94IEFTIGJvdW5kaW5nX2JveFxuRlJPTSBfX1NDSEVNQV9fLmNoYW5nZXNldHM7XG5cbkRST1AgVklFVyBJRiBFWElTVFMgX19WSUVXX1NDSEVNQV9fLmNob2ljZV9saXN0c192aWV3O1xuXG5DUkVBVEUgT1IgUkVQTEFDRSBWSUVXIF9fVklFV19TQ0hFTUFfXy5jaG9pY2VfbGlzdHNfdmlldyBBU1xuU0VMRUNUXG4gIHJvd19yZXNvdXJjZV9pZCBBUyBjaG9pY2VfbGlzdF9pZCxcbiAgbmFtZSBBUyBuYW1lLFxuICBkZXNjcmlwdGlvbiBBUyBkZXNjcmlwdGlvbixcbiAgdmVyc2lvbiBBUyB2ZXJzaW9uLFxuICBpdGVtcyBBUyBpdGVtcyxcbiAgY3JlYXRlZF9ieV9yZXNvdXJjZV9pZCBBUyBjcmVhdGVkX2J5X2lkLFxuICB1cGRhdGVkX2J5X3Jlc291cmNlX2lkIEFTIHVwZGF0ZWRfYnlfaWQsXG4gIGNyZWF0ZWRfYXQgQVMgY3JlYXRlZF9hdCxcbiAgdXBkYXRlZF9hdCBBUyB1cGRhdGVkX2F0LFxuICBkZWxldGVkX2F0IEFTIGRlbGV0ZWRfYXRcbkZST00gX19TQ0hFTUFfXy5jaG9pY2VfbGlzdHM7XG5cbkRST1AgVklFVyBJRiBFWElTVFMgX19WSUVXX1NDSEVNQV9fLmNsYXNzaWZpY2F0aW9uX3NldHNfdmlldztcblxuQ1JFQVRFIE9SIFJFUExBQ0UgVklFVyBfX1ZJRVdfU0NIRU1BX18uY2xhc3NpZmljYXRpb25fc2V0c192aWV3IEFTXG5TRUxFQ1RcbiAgcm93X3Jlc291cmNlX2lkIEFTIGNsYXNzaWZpY2F0aW9uX3NldF9pZCxcbiAgbmFtZSBBUyBuYW1lLFxuICBkZXNjcmlwdGlvbiBBUyBkZXNjcmlwdGlvbixcbiAgdmVyc2lvbiBBUyB2ZXJzaW9uLFxuICBpdGVtcyBBUyBpdGVtcyxcbiAgY3JlYXRlZF9ieV9yZXNvdXJjZV9pZCBBUyBjcmVhdGVkX2J5X2lkLFxuICB1cGRhdGVkX2J5X3Jlc291cmNlX2lkIEFTIHVwZGF0ZWRfYnlfaWQsXG4gIGNyZWF0ZWRfYXQgQVMgY3JlYXRlZF9hdCxcbiAgdXBkYXRlZF9hdCBBUyB1cGRhdGVkX2F0LFxuICBkZWxldGVkX2F0IEFTIGRlbGV0ZWRfYXRcbkZST00gX19TQ0hFTUFfXy5jbGFzc2lmaWNhdGlvbl9zZXRzO1xuXG5EUk9QIFZJRVcgSUYgRVhJU1RTIF9fVklFV19TQ0hFTUFfXy5mb3Jtc192aWV3O1xuXG5DUkVBVEUgT1IgUkVQTEFDRSBWSUVXIF9fVklFV19TQ0hFTUFfXy5mb3Jtc192aWV3IEFTXG5TRUxFQ1RcbiAgcm93X3Jlc291cmNlX2lkIEFTIGZvcm1faWQsXG4gIG5hbWUgQVMgbmFtZSxcbiAgZGVzY3JpcHRpb24gQVMgZGVzY3JpcHRpb24sXG4gIHZlcnNpb24gQVMgdmVyc2lvbixcbiAgZWxlbWVudHMgQVMgZWxlbWVudHMsXG4gIGJvdW5kaW5nX2JveCBBUyBib3VuZGluZ19ib3gsXG4gIHN0YXR1cyBBUyBzdGF0dXMsXG4gIHN0YXR1c19maWVsZCBBUyBzdGF0dXNfZmllbGQsXG4gIGNyZWF0ZWRfYnlfcmVzb3VyY2VfaWQgQVMgY3JlYXRlZF9ieV9pZCxcbiAgdXBkYXRlZF9ieV9yZXNvdXJjZV9pZCBBUyB1cGRhdGVkX2J5X2lkLFxuICBjcmVhdGVkX2F0IEFTIGNyZWF0ZWRfYXQsXG4gIHVwZGF0ZWRfYXQgQVMgdXBkYXRlZF9hdCxcbiAgZGVsZXRlZF9hdCBBUyBkZWxldGVkX2F0LFxuICBhdXRvX2Fzc2lnbiBBUyBhdXRvX2Fzc2lnbixcbiAgdGl0bGVfZmllbGRfa2V5cyBBUyB0aXRsZV9maWVsZF9rZXlzLFxuICBoaWRkZW5fb25fZGFzaGJvYXJkIEFTIGhpZGRlbl9vbl9kYXNoYm9hcmQsXG4gIGdlb21ldHJ5X3R5cGVzIEFTIGdlb21ldHJ5X3R5cGVzLFxuICBnZW9tZXRyeV9yZXF1aXJlZCBBUyBnZW9tZXRyeV9yZXF1aXJlZCxcbiAgc2NyaXB0IEFTIHNjcmlwdCxcbiAgaW1hZ2UgQVMgaW1hZ2UsXG4gIHByb2plY3RzX2VuYWJsZWQgQVMgcHJvamVjdHNfZW5hYmxlZCxcbiAgYXNzaWdubWVudF9lbmFibGVkIEFTIGFzc2lnbm1lbnRfZW5hYmxlZFxuRlJPTSBfX1NDSEVNQV9fLmZvcm1zO1xuXG5EUk9QIFZJRVcgSUYgRVhJU1RTIF9fVklFV19TQ0hFTUFfXy5tZW1iZXJzaGlwc192aWV3O1xuXG5DUkVBVEUgT1IgUkVQTEFDRSBWSUVXIF9fVklFV19TQ0hFTUFfXy5tZW1iZXJzaGlwc192aWV3IEFTXG5TRUxFQ1RcbiAgbWVtYmVyc2hpcHMucm93X3Jlc291cmNlX2lkIEFTIG1lbWJlcnNoaXBfaWQsXG4gIG1lbWJlcnNoaXBzLnVzZXJfcmVzb3VyY2VfaWQgQVMgdXNlcl9pZCxcbiAgbWVtYmVyc2hpcHMuZmlyc3RfbmFtZSBBUyBmaXJzdF9uYW1lLFxuICBtZW1iZXJzaGlwcy5sYXN0X25hbWUgQVMgbGFzdF9uYW1lLFxuICBtZW1iZXJzaGlwcy5uYW1lIEFTIG5hbWUsXG4gIG1lbWJlcnNoaXBzLmVtYWlsIEFTIGVtYWlsLFxuICBtZW1iZXJzaGlwcy5yb2xlX3Jlc291cmNlX2lkIEFTIHJvbGVfaWQsXG4gIHJvbGVzLm5hbWUgQVMgcm9sZV9uYW1lLFxuICBtZW1iZXJzaGlwcy5zdGF0dXMgQVMgc3RhdHVzLFxuICBtZW1iZXJzaGlwcy5jcmVhdGVkX2F0IEFTIGNyZWF0ZWRfYXQsXG4gIG1lbWJlcnNoaXBzLnVwZGF0ZWRfYXQgQVMgdXBkYXRlZF9hdCxcbiAgbWVtYmVyc2hpcHMuZGVsZXRlZF9hdCBBUyBkZWxldGVkX2F0XG5GUk9NIF9fU0NIRU1BX18ubWVtYmVyc2hpcHMgbWVtYmVyc2hpcHNcbkxFRlQgT1VURVIgSk9JTiBfX1NDSEVNQV9fLnJvbGVzIHJvbGVzIE9OIG1lbWJlcnNoaXBzLnJvbGVfcmVzb3VyY2VfaWQgPSByb2xlcy5yb3dfcmVzb3VyY2VfaWQ7XG5cbkRST1AgVklFVyBJRiBFWElTVFMgX19WSUVXX1NDSEVNQV9fLnBob3Rvc192aWV3O1xuXG5DUkVBVEUgT1IgUkVQTEFDRSBWSUVXIF9fVklFV19TQ0hFTUFfXy5waG90b3NfdmlldyBBU1xuU0VMRUNUXG4gIGFjY2Vzc19rZXkgQVMgcGhvdG9faWQsXG4gIHJlY29yZF9yZXNvdXJjZV9pZCBBUyByZWNvcmRfaWQsXG4gIGZvcm1fcmVzb3VyY2VfaWQgQVMgZm9ybV9pZCxcbiAgZXhpZiBBUyBleGlmLFxuICBmaWxlX3NpemUgQVMgZmlsZV9zaXplLFxuICBjcmVhdGVkX2J5X3Jlc291cmNlX2lkIEFTIGNyZWF0ZWRfYnlfaWQsXG4gIHVwZGF0ZWRfYnlfcmVzb3VyY2VfaWQgQVMgdXBkYXRlZF9ieV9pZCxcbiAgY3JlYXRlZF9hdCBBUyBjcmVhdGVkX2F0LFxuICB1cGRhdGVkX2F0IEFTIHVwZGF0ZWRfYXQsXG4gIGZpbGUgQVMgZmlsZSxcbiAgY29udGVudF90eXBlIEFTIGNvbnRlbnRfdHlwZSxcbiAgaXNfdXBsb2FkZWQgQVMgaXNfdXBsb2FkZWQsXG4gIGlzX3N0b3JlZCBBUyBpc19zdG9yZWQsXG4gIGlzX3Byb2Nlc3NlZCBBUyBpc19wcm9jZXNzZWQsXG4gIGdlb21ldHJ5IEFTIGdlb21ldHJ5LFxuICBsYXRpdHVkZSBBUyBsYXRpdHVkZSxcbiAgbG9uZ2l0dWRlIEFTIGxvbmdpdHVkZSxcbiAgYWx0aXR1ZGUgQVMgYWx0aXR1ZGUsXG4gIGFjY3VyYWN5IEFTIGFjY3VyYWN5LFxuICBkaXJlY3Rpb24gQVMgZGlyZWN0aW9uLFxuICB3aWR0aCBBUyB3aWR0aCxcbiAgaGVpZ2h0IEFTIGhlaWdodCxcbiAgbWFrZSBBUyBtYWtlLFxuICBtb2RlbCBBUyBtb2RlbCxcbiAgc29mdHdhcmUgQVMgc29mdHdhcmUsXG4gIGRhdGVfdGltZSBBUyBkYXRlX3RpbWVcbkZST00gX19TQ0hFTUFfXy5waG90b3M7XG5cbkRST1AgVklFVyBJRiBFWElTVFMgX19WSUVXX1NDSEVNQV9fLnByb2plY3RzX3ZpZXc7XG5cbkNSRUFURSBPUiBSRVBMQUNFIFZJRVcgX19WSUVXX1NDSEVNQV9fLnByb2plY3RzX3ZpZXcgQVNcblNFTEVDVFxuICByb3dfcmVzb3VyY2VfaWQgQVMgcHJvamVjdF9pZCxcbiAgbmFtZSBBUyBuYW1lLFxuICBkZXNjcmlwdGlvbiBBUyBkZXNjcmlwdGlvbixcbiAgY3JlYXRlZF9ieV9yZXNvdXJjZV9pZCBBUyBjcmVhdGVkX2J5X2lkLFxuICBjcmVhdGVkX2F0IEFTIGNyZWF0ZWRfYXQsXG4gIHVwZGF0ZWRfYXQgQVMgdXBkYXRlZF9hdCxcbiAgZGVsZXRlZF9hdCBBUyBkZWxldGVkX2F0XG5GUk9NIF9fU0NIRU1BX18ucHJvamVjdHM7XG5cbkRST1AgVklFVyBJRiBFWElTVFMgX19WSUVXX1NDSEVNQV9fLnJvbGVzX3ZpZXc7XG5cbkNSRUFURSBPUiBSRVBMQUNFIFZJRVcgX19WSUVXX1NDSEVNQV9fLnJvbGVzX3ZpZXcgQVNcblNFTEVDVFxuICByb3dfcmVzb3VyY2VfaWQgQVMgcm9sZV9pZCxcbiAgbmFtZSBBUyBuYW1lLFxuICBkZXNjcmlwdGlvbiBBUyBkZXNjcmlwdGlvbixcbiAgY3JlYXRlZF9ieV9yZXNvdXJjZV9pZCBBUyBjcmVhdGVkX2J5X2lkLFxuICB1cGRhdGVkX2J5X3Jlc291cmNlX2lkIEFTIHVwZGF0ZWRfYnlfaWQsXG4gIGNyZWF0ZWRfYXQgQVMgY3JlYXRlZF9hdCxcbiAgdXBkYXRlZF9hdCBBUyB1cGRhdGVkX2F0LFxuICBkZWxldGVkX2F0IEFTIGRlbGV0ZWRfYXQsXG4gIGlzX3N5c3RlbSBBUyBpc19zeXN0ZW0sXG4gIGlzX2RlZmF1bHQgQVMgaXNfZGVmYXVsdCxcbiAgY2FuX21hbmFnZV9zdWJzY3JpcHRpb24gQVMgY2FuX21hbmFnZV9zdWJzY3JpcHRpb24sXG4gIGNhbl91cGRhdGVfb3JnYW5pemF0aW9uIEFTIGNhbl91cGRhdGVfb3JnYW5pemF0aW9uLFxuICBjYW5fbWFuYWdlX21lbWJlcnMgQVMgY2FuX21hbmFnZV9tZW1iZXJzLFxuICBjYW5fbWFuYWdlX3JvbGVzIEFTIGNhbl9tYW5hZ2Vfcm9sZXMsXG4gIGNhbl9tYW5hZ2VfYXBwcyBBUyBjYW5fbWFuYWdlX2FwcHMsXG4gIGNhbl9tYW5hZ2VfcHJvamVjdHMgQVMgY2FuX21hbmFnZV9wcm9qZWN0cyxcbiAgY2FuX21hbmFnZV9jaG9pY2VfbGlzdHMgQVMgY2FuX21hbmFnZV9jaG9pY2VfbGlzdHMsXG4gIGNhbl9tYW5hZ2VfY2xhc3NpZmljYXRpb25fc2V0cyBBUyBjYW5fbWFuYWdlX2NsYXNzaWZpY2F0aW9uX3NldHMsXG4gIGNhbl9jcmVhdGVfcmVjb3JkcyBBUyBjYW5fY3JlYXRlX3JlY29yZHMsXG4gIGNhbl91cGRhdGVfcmVjb3JkcyBBUyBjYW5fdXBkYXRlX3JlY29yZHMsXG4gIGNhbl9kZWxldGVfcmVjb3JkcyBBUyBjYW5fZGVsZXRlX3JlY29yZHMsXG4gIGNhbl9jaGFuZ2Vfc3RhdHVzIEFTIGNhbl9jaGFuZ2Vfc3RhdHVzLFxuICBjYW5fY2hhbmdlX3Byb2plY3QgQVMgY2FuX2NoYW5nZV9wcm9qZWN0LFxuICBjYW5fYXNzaWduX3JlY29yZHMgQVMgY2FuX2Fzc2lnbl9yZWNvcmRzLFxuICBjYW5faW1wb3J0X3JlY29yZHMgQVMgY2FuX2ltcG9ydF9yZWNvcmRzLFxuICBjYW5fZXhwb3J0X3JlY29yZHMgQVMgY2FuX2V4cG9ydF9yZWNvcmRzLFxuICBjYW5fcnVuX3JlcG9ydHMgQVMgY2FuX3J1bl9yZXBvcnRzLFxuICBjYW5fbWFuYWdlX2F1dGhvcml6YXRpb25zIEFTIGNhbl9tYW5hZ2VfYXV0aG9yaXphdGlvbnNcbkZST00gX19TQ0hFTUFfXy5yb2xlcztcblxuRFJPUCBWSUVXIElGIEVYSVNUUyBfX1ZJRVdfU0NIRU1BX18uc2lnbmF0dXJlc192aWV3O1xuXG5DUkVBVEUgT1IgUkVQTEFDRSBWSUVXIF9fVklFV19TQ0hFTUFfXy5zaWduYXR1cmVzX3ZpZXcgQVNcblNFTEVDVFxuICBhY2Nlc3Nfa2V5IEFTIHNpZ25hdHVyZV9pZCxcbiAgcmVjb3JkX3Jlc291cmNlX2lkIEFTIHJlY29yZF9pZCxcbiAgZm9ybV9yZXNvdXJjZV9pZCBBUyBmb3JtX2lkLFxuICBmaWxlX3NpemUgQVMgZmlsZV9zaXplLFxuICBjcmVhdGVkX2J5X3Jlc291cmNlX2lkIEFTIGNyZWF0ZWRfYnlfaWQsXG4gIHVwZGF0ZWRfYnlfcmVzb3VyY2VfaWQgQVMgdXBkYXRlZF9ieV9pZCxcbiAgY3JlYXRlZF9hdCBBUyBjcmVhdGVkX2F0LFxuICB1cGRhdGVkX2F0IEFTIHVwZGF0ZWRfYXQsXG4gIGZpbGUgQVMgZmlsZSxcbiAgY29udGVudF90eXBlIEFTIGNvbnRlbnRfdHlwZSxcbiAgaXNfdXBsb2FkZWQgQVMgaXNfdXBsb2FkZWQsXG4gIGlzX3N0b3JlZCBBUyBpc19zdG9yZWQsXG4gIGlzX3Byb2Nlc3NlZCBBUyBpc19wcm9jZXNzZWRcbkZST00gX19TQ0hFTUFfXy5zaWduYXR1cmVzO1xuXG5EUk9QIFZJRVcgSUYgRVhJU1RTIF9fVklFV19TQ0hFTUFfXy52aWRlb3NfdmlldztcblxuQ1JFQVRFIE9SIFJFUExBQ0UgVklFVyBfX1ZJRVdfU0NIRU1BX18udmlkZW9zX3ZpZXcgQVNcblNFTEVDVFxuICBhY2Nlc3Nfa2V5IEFTIHZpZGVvX2lkLFxuICByZWNvcmRfcmVzb3VyY2VfaWQgQVMgcmVjb3JkX2lkLFxuICBmb3JtX3Jlc291cmNlX2lkIEFTIGZvcm1faWQsXG4gIG1ldGFkYXRhIEFTIG1ldGFkYXRhLFxuICBmaWxlX3NpemUgQVMgZmlsZV9zaXplLFxuICBjcmVhdGVkX2J5X3Jlc291cmNlX2lkIEFTIGNyZWF0ZWRfYnlfaWQsXG4gIHVwZGF0ZWRfYnlfcmVzb3VyY2VfaWQgQVMgdXBkYXRlZF9ieV9pZCxcbiAgY3JlYXRlZF9hdCBBUyBjcmVhdGVkX2F0LFxuICB1cGRhdGVkX2F0IEFTIHVwZGF0ZWRfYXQsXG4gIGZpbGUgQVMgZmlsZSxcbiAgY29udGVudF90eXBlIEFTIGNvbnRlbnRfdHlwZSxcbiAgaXNfdXBsb2FkZWQgQVMgaXNfdXBsb2FkZWQsXG4gIGlzX3N0b3JlZCBBUyBpc19zdG9yZWQsXG4gIGlzX3Byb2Nlc3NlZCBBUyBpc19wcm9jZXNzZWQsXG4gIGhhc190cmFjayBBUyBoYXNfdHJhY2ssXG4gIHRyYWNrIEFTIHRyYWNrLFxuICBnZW9tZXRyeSBBUyBnZW9tZXRyeSxcbiAgd2lkdGggQVMgd2lkdGgsXG4gIGhlaWdodCBBUyBoZWlnaHQsXG4gIGR1cmF0aW9uIEFTIGR1cmF0aW9uLFxuICBiaXRfcmF0ZSBBUyBiaXRfcmF0ZVxuRlJPTSBfX1NDSEVNQV9fLnZpZGVvcztcblxuQ1JFQVRFIFVOSVFVRSBJTkRFWCBpZHhfYXVkaW9fcm93X3Jlc291cmNlX2lkIE9OIF9fU0NIRU1BX18uYXVkaW8gVVNJTkcgYnRyZWUgKHJvd19yZXNvdXJjZV9pZCk7XG5cbkNSRUFURSBVTklRVUUgSU5ERVggaWR4X2F1ZGlvX3Jvd19pZCBPTiBfX1NDSEVNQV9fLmF1ZGlvIFVTSU5HIGJ0cmVlIChyb3dfaWQpO1xuXG5DUkVBVEUgSU5ERVggaWR4X2F1ZGlvX2FjY2Vzc19rZXkgT04gX19TQ0hFTUFfXy5hdWRpbyBVU0lORyBidHJlZSAoYWNjZXNzX2tleSk7XG5cbkNSRUFURSBJTkRFWCBpZHhfYXVkaW9fcmVjb3JkX3Jlc291cmNlX2lkIE9OIF9fU0NIRU1BX18uYXVkaW8gVVNJTkcgYnRyZWUgKHJlY29yZF9yZXNvdXJjZV9pZCk7XG5cbkNSRUFURSBJTkRFWCBpZHhfYXVkaW9fZm9ybV9yZXNvdXJjZV9pZCBPTiBfX1NDSEVNQV9fLmF1ZGlvIFVTSU5HIGJ0cmVlIChmb3JtX3Jlc291cmNlX2lkKTtcblxuQ1JFQVRFIElOREVYIGlkeF9hdWRpb19jcmVhdGVkX2J5X3Jlc291cmNlX2lkIE9OIF9fU0NIRU1BX18uYXVkaW8gVVNJTkcgYnRyZWUgKGNyZWF0ZWRfYnlfcmVzb3VyY2VfaWQpO1xuXG5DUkVBVEUgSU5ERVggaWR4X2F1ZGlvX2dlb21ldHJ5IE9OIF9fU0NIRU1BX18uYXVkaW8gVVNJTkcgZ2lzdCAoZ2VvbWV0cnkpO1xuXG5DUkVBVEUgSU5ERVggaWR4X2F1ZGlvX3VwZGF0ZWRfYXQgT04gX19TQ0hFTUFfXy5hdWRpbyBVU0lORyBidHJlZSAodXBkYXRlZF9hdCk7XG5cbkNSRUFURSBVTklRVUUgSU5ERVggaWR4X2NoYW5nZXNldHNfcm93X3Jlc291cmNlX2lkIE9OIF9fU0NIRU1BX18uY2hhbmdlc2V0cyBVU0lORyBidHJlZSAocm93X3Jlc291cmNlX2lkKTtcblxuQ1JFQVRFIFVOSVFVRSBJTkRFWCBpZHhfY2hhbmdlc2V0c19yb3dfaWQgT04gX19TQ0hFTUFfXy5jaGFuZ2VzZXRzIFVTSU5HIGJ0cmVlIChyb3dfaWQpO1xuXG5DUkVBVEUgSU5ERVggaWR4X2NoYW5nZXNldHNfZm9ybV9pZCBPTiBfX1NDSEVNQV9fLmNoYW5nZXNldHMgVVNJTkcgYnRyZWUgKGZvcm1faWQpO1xuXG5DUkVBVEUgSU5ERVggaWR4X2NoYW5nZXNldHNfbWV0YWRhdGFfaW5kZXggT04gX19TQ0hFTUFfXy5jaGFuZ2VzZXRzIFVTSU5HIGdpbiAobWV0YWRhdGFfaW5kZXgpIFdJVEggKGZhc3R1cGRhdGUgPSBvZmYpO1xuXG5DUkVBVEUgSU5ERVggaWR4X2NoYW5nZXNldHNfZm9ybV9pZF91cGRhdGVkX2F0IE9OIF9fU0NIRU1BX18uY2hhbmdlc2V0cyBVU0lORyBidHJlZSAoZm9ybV9pZCwgdXBkYXRlZF9hdCk7XG5cbkNSRUFURSBJTkRFWCBpZHhfY2hhbmdlc2V0c191cGRhdGVkX2F0IE9OIF9fU0NIRU1BX18uY2hhbmdlc2V0cyBVU0lORyBidHJlZSAodXBkYXRlZF9hdCk7XG5cbkNSRUFURSBVTklRVUUgSU5ERVggaWR4X2Nob2ljZV9saXN0c19yb3dfcmVzb3VyY2VfaWQgT04gX19TQ0hFTUFfXy5jaG9pY2VfbGlzdHMgVVNJTkcgYnRyZWUgKHJvd19yZXNvdXJjZV9pZCk7XG5cbkNSRUFURSBVTklRVUUgSU5ERVggaWR4X2Nob2ljZV9saXN0c19yb3dfaWQgT04gX19TQ0hFTUFfXy5jaG9pY2VfbGlzdHMgVVNJTkcgYnRyZWUgKHJvd19pZCk7XG5cbkNSRUFURSBJTkRFWCBpZHhfY2hvaWNlX2xpc3RzX25hbWUgT04gX19TQ0hFTUFfXy5jaG9pY2VfbGlzdHMgVVNJTkcgYnRyZWUgKG5hbWUpO1xuXG5DUkVBVEUgSU5ERVggaWR4X2Nob2ljZV9saXN0c191cGRhdGVkX2F0IE9OIF9fU0NIRU1BX18uY2hvaWNlX2xpc3RzIFVTSU5HIGJ0cmVlICh1cGRhdGVkX2F0KTtcblxuQ1JFQVRFIFVOSVFVRSBJTkRFWCBpZHhfY2xhc3NpZmljYXRpb25fc2V0c19yb3dfcmVzb3VyY2VfaWQgT04gX19TQ0hFTUFfXy5jbGFzc2lmaWNhdGlvbl9zZXRzIFVTSU5HIGJ0cmVlIChyb3dfcmVzb3VyY2VfaWQpO1xuXG5DUkVBVEUgVU5JUVVFIElOREVYIGlkeF9jbGFzc2lmaWNhdGlvbl9zZXRzX3Jvd19pZCBPTiBfX1NDSEVNQV9fLmNsYXNzaWZpY2F0aW9uX3NldHMgVVNJTkcgYnRyZWUgKHJvd19pZCk7XG5cbkNSRUFURSBJTkRFWCBpZHhfY2xhc3NpZmljYXRpb25fc2V0c19uYW1lIE9OIF9fU0NIRU1BX18uY2xhc3NpZmljYXRpb25fc2V0cyBVU0lORyBidHJlZSAobmFtZSk7XG5cbkNSRUFURSBJTkRFWCBpZHhfY2xhc3NpZmljYXRpb25fc2V0c191cGRhdGVkX2F0IE9OIF9fU0NIRU1BX18uY2xhc3NpZmljYXRpb25fc2V0cyBVU0lORyBidHJlZSAodXBkYXRlZF9hdCk7XG5cbkNSRUFURSBVTklRVUUgSU5ERVggaWR4X2Zvcm1zX3Jvd19yZXNvdXJjZV9pZCBPTiBfX1NDSEVNQV9fLmZvcm1zIFVTSU5HIGJ0cmVlIChyb3dfcmVzb3VyY2VfaWQpO1xuXG5DUkVBVEUgVU5JUVVFIElOREVYIGlkeF9mb3Jtc19yb3dfaWQgT04gX19TQ0hFTUFfXy5mb3JtcyBVU0lORyBidHJlZSAocm93X2lkKTtcblxuQ1JFQVRFIElOREVYIGlkeF9mb3Jtc19uYW1lIE9OIF9fU0NIRU1BX18uZm9ybXMgVVNJTkcgYnRyZWUgKG5hbWUpO1xuXG5DUkVBVEUgSU5ERVggaWR4X2Zvcm1zX3VwZGF0ZWRfYXQgT04gX19TQ0hFTUFfXy5mb3JtcyBVU0lORyBidHJlZSAodXBkYXRlZF9hdCk7XG5cbkNSRUFURSBVTklRVUUgSU5ERVggaWR4X21lbWJlcnNoaXBzX3Jvd19yZXNvdXJjZV9pZCBPTiBfX1NDSEVNQV9fLm1lbWJlcnNoaXBzIFVTSU5HIGJ0cmVlIChyb3dfcmVzb3VyY2VfaWQpO1xuXG5DUkVBVEUgVU5JUVVFIElOREVYIGlkeF9tZW1iZXJzaGlwc19yb3dfaWQgT04gX19TQ0hFTUFfXy5tZW1iZXJzaGlwcyBVU0lORyBidHJlZSAocm93X2lkKTtcblxuQ1JFQVRFIElOREVYIGlkeF9tZW1iZXJzaGlwc191c2VyX3Jlc291cmNlX2lkIE9OIF9fU0NIRU1BX18ubWVtYmVyc2hpcHMgVVNJTkcgYnRyZWUgKHVzZXJfcmVzb3VyY2VfaWQpO1xuXG5DUkVBVEUgSU5ERVggaWR4X21lbWJlcnNoaXBzX3JvbGVfcmVzb3VyY2VfaWQgT04gX19TQ0hFTUFfXy5tZW1iZXJzaGlwcyBVU0lORyBidHJlZSAocm9sZV9yZXNvdXJjZV9pZCk7XG5cbkNSRUFURSBJTkRFWCBpZHhfbWVtYmVyc2hpcHNfbmFtZSBPTiBfX1NDSEVNQV9fLm1lbWJlcnNoaXBzIFVTSU5HIGJ0cmVlIChuYW1lKTtcblxuQ1JFQVRFIElOREVYIGlkeF9tZW1iZXJzaGlwc191cGRhdGVkX2F0IE9OIF9fU0NIRU1BX18ubWVtYmVyc2hpcHMgVVNJTkcgYnRyZWUgKHVwZGF0ZWRfYXQpO1xuXG5DUkVBVEUgVU5JUVVFIElOREVYIGlkeF9waG90b3Nfcm93X3Jlc291cmNlX2lkIE9OIF9fU0NIRU1BX18ucGhvdG9zIFVTSU5HIGJ0cmVlIChyb3dfcmVzb3VyY2VfaWQpO1xuXG5DUkVBVEUgVU5JUVVFIElOREVYIGlkeF9waG90b3Nfcm93X2lkIE9OIF9fU0NIRU1BX18ucGhvdG9zIFVTSU5HIGJ0cmVlIChyb3dfaWQpO1xuXG5DUkVBVEUgSU5ERVggaWR4X3Bob3Rvc19hY2Nlc3Nfa2V5IE9OIF9fU0NIRU1BX18ucGhvdG9zIFVTSU5HIGJ0cmVlIChhY2Nlc3Nfa2V5KTtcblxuQ1JFQVRFIElOREVYIGlkeF9waG90b3NfcmVjb3JkX3Jlc291cmNlX2lkIE9OIF9fU0NIRU1BX18ucGhvdG9zIFVTSU5HIGJ0cmVlIChyZWNvcmRfcmVzb3VyY2VfaWQpO1xuXG5DUkVBVEUgSU5ERVggaWR4X3Bob3Rvc19mb3JtX3Jlc291cmNlX2lkIE9OIF9fU0NIRU1BX18ucGhvdG9zIFVTSU5HIGJ0cmVlIChmb3JtX3Jlc291cmNlX2lkKTtcblxuQ1JFQVRFIElOREVYIGlkeF9waG90b3NfY3JlYXRlZF9ieV9yZXNvdXJjZV9pZCBPTiBfX1NDSEVNQV9fLnBob3RvcyBVU0lORyBidHJlZSAoY3JlYXRlZF9ieV9yZXNvdXJjZV9pZCk7XG5cbkNSRUFURSBJTkRFWCBpZHhfcGhvdG9zX2dlb21ldHJ5IE9OIF9fU0NIRU1BX18ucGhvdG9zIFVTSU5HIGdpc3QgKGdlb21ldHJ5KTtcblxuQ1JFQVRFIElOREVYIGlkeF9waG90b3NfdXBkYXRlZF9hdCBPTiBfX1NDSEVNQV9fLnBob3RvcyBVU0lORyBidHJlZSAodXBkYXRlZF9hdCk7XG5cbkNSRUFURSBVTklRVUUgSU5ERVggaWR4X3Byb2plY3RzX3Jvd19yZXNvdXJjZV9pZCBPTiBfX1NDSEVNQV9fLnByb2plY3RzIFVTSU5HIGJ0cmVlIChyb3dfcmVzb3VyY2VfaWQpO1xuXG5DUkVBVEUgVU5JUVVFIElOREVYIGlkeF9wcm9qZWN0c19yb3dfaWQgT04gX19TQ0hFTUFfXy5wcm9qZWN0cyBVU0lORyBidHJlZSAocm93X2lkKTtcblxuQ1JFQVRFIElOREVYIGlkeF9wcm9qZWN0c19uYW1lIE9OIF9fU0NIRU1BX18ucHJvamVjdHMgVVNJTkcgYnRyZWUgKG5hbWUpO1xuXG5DUkVBVEUgSU5ERVggaWR4X3Byb2plY3RzX3VwZGF0ZWRfYXQgT04gX19TQ0hFTUFfXy5wcm9qZWN0cyBVU0lORyBidHJlZSAodXBkYXRlZF9hdCk7XG5cbkNSRUFURSBVTklRVUUgSU5ERVggaWR4X3JvbGVzX3Jvd19yZXNvdXJjZV9pZCBPTiBfX1NDSEVNQV9fLnJvbGVzIFVTSU5HIGJ0cmVlIChyb3dfcmVzb3VyY2VfaWQpO1xuXG5DUkVBVEUgVU5JUVVFIElOREVYIGlkeF9yb2xlc19yb3dfaWQgT04gX19TQ0hFTUFfXy5yb2xlcyBVU0lORyBidHJlZSAocm93X2lkKTtcblxuQ1JFQVRFIElOREVYIGlkeF9yb2xlc19uYW1lIE9OIF9fU0NIRU1BX18ucm9sZXMgVVNJTkcgYnRyZWUgKG5hbWUpO1xuXG5DUkVBVEUgSU5ERVggaWR4X3JvbGVzX3VwZGF0ZWRfYXQgT04gX19TQ0hFTUFfXy5yb2xlcyBVU0lORyBidHJlZSAodXBkYXRlZF9hdCk7XG5cbkNSRUFURSBVTklRVUUgSU5ERVggaWR4X3NpZ25hdHVyZXNfcm93X3Jlc291cmNlX2lkIE9OIF9fU0NIRU1BX18uc2lnbmF0dXJlcyBVU0lORyBidHJlZSAocm93X3Jlc291cmNlX2lkKTtcblxuQ1JFQVRFIFVOSVFVRSBJTkRFWCBpZHhfc2lnbmF0dXJlc19yb3dfaWQgT04gX19TQ0hFTUFfXy5zaWduYXR1cmVzIFVTSU5HIGJ0cmVlIChyb3dfaWQpO1xuXG5DUkVBVEUgSU5ERVggaWR4X3NpZ25hdHVyZXNfYWNjZXNzX2tleSBPTiBfX1NDSEVNQV9fLnNpZ25hdHVyZXMgVVNJTkcgYnRyZWUgKGFjY2Vzc19rZXkpO1xuXG5DUkVBVEUgSU5ERVggaWR4X3NpZ25hdHVyZXNfcmVjb3JkX3Jlc291cmNlX2lkIE9OIF9fU0NIRU1BX18uc2lnbmF0dXJlcyBVU0lORyBidHJlZSAocmVjb3JkX3Jlc291cmNlX2lkKTtcblxuQ1JFQVRFIElOREVYIGlkeF9zaWduYXR1cmVzX2Zvcm1fcmVzb3VyY2VfaWQgT04gX19TQ0hFTUFfXy5zaWduYXR1cmVzIFVTSU5HIGJ0cmVlIChmb3JtX3Jlc291cmNlX2lkKTtcblxuQ1JFQVRFIElOREVYIGlkeF9zaWduYXR1cmVzX2NyZWF0ZWRfYnlfcmVzb3VyY2VfaWQgT04gX19TQ0hFTUFfXy5zaWduYXR1cmVzIFVTSU5HIGJ0cmVlIChjcmVhdGVkX2J5X3Jlc291cmNlX2lkKTtcblxuQ1JFQVRFIElOREVYIGlkeF9zaWduYXR1cmVzX3VwZGF0ZWRfYXQgT04gX19TQ0hFTUFfXy5zaWduYXR1cmVzIFVTSU5HIGJ0cmVlICh1cGRhdGVkX2F0KTtcblxuQ1JFQVRFIFVOSVFVRSBJTkRFWCBpZHhfdmlkZW9zX3Jvd19yZXNvdXJjZV9pZCBPTiBfX1NDSEVNQV9fLnZpZGVvcyBVU0lORyBidHJlZSAocm93X3Jlc291cmNlX2lkKTtcblxuQ1JFQVRFIFVOSVFVRSBJTkRFWCBpZHhfdmlkZW9zX3Jvd19pZCBPTiBfX1NDSEVNQV9fLnZpZGVvcyBVU0lORyBidHJlZSAocm93X2lkKTtcblxuQ1JFQVRFIElOREVYIGlkeF92aWRlb3NfYWNjZXNzX2tleSBPTiBfX1NDSEVNQV9fLnZpZGVvcyBVU0lORyBidHJlZSAoYWNjZXNzX2tleSk7XG5cbkNSRUFURSBJTkRFWCBpZHhfdmlkZW9zX3JlY29yZF9yZXNvdXJjZV9pZCBPTiBfX1NDSEVNQV9fLnZpZGVvcyBVU0lORyBidHJlZSAocmVjb3JkX3Jlc291cmNlX2lkKTtcblxuQ1JFQVRFIElOREVYIGlkeF92aWRlb3NfZm9ybV9yZXNvdXJjZV9pZCBPTiBfX1NDSEVNQV9fLnZpZGVvcyBVU0lORyBidHJlZSAoZm9ybV9yZXNvdXJjZV9pZCk7XG5cbkNSRUFURSBJTkRFWCBpZHhfdmlkZW9zX2NyZWF0ZWRfYnlfcmVzb3VyY2VfaWQgT04gX19TQ0hFTUFfXy52aWRlb3MgVVNJTkcgYnRyZWUgKGNyZWF0ZWRfYnlfcmVzb3VyY2VfaWQpO1xuXG5DUkVBVEUgSU5ERVggaWR4X3ZpZGVvc19nZW9tZXRyeSBPTiBfX1NDSEVNQV9fLnZpZGVvcyBVU0lORyBnaXN0IChnZW9tZXRyeSk7XG5cbkNSRUFURSBJTkRFWCBpZHhfdmlkZW9zX3VwZGF0ZWRfYXQgT04gX19TQ0hFTUFfXy52aWRlb3MgVVNJTkcgYnRyZWUgKHVwZGF0ZWRfYXQpO1xuYDtcbiJdfQ==