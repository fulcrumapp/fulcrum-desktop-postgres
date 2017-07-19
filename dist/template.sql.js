"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = `
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
  form_id bigint NOT NULL,
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
  CONSTRAINT forms_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS __SCHEMA__.memberships (
  id bigserial NOT NULL,
  row_id bigint NOT NULL,
  row_resource_id text NOT NULL,
  user_id bigint NOT NULL,
  user_resource_id text,
  first_name text,
  last_name text,
  name text,
  email text,
  role_id bigint NOT NULL,
  role_resource_id text NOT NULL,
  role_name text NOT NULL,
  status text,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
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
  metadata_index AS metadata_index
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
  updated_at AS updated_at
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
  updated_at AS updated_at
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
  row_resource_id AS membership_id,
  user_resource_id AS user_id,
  first_name AS first_name,
  last_name AS last_name,
  name AS name,
  email AS email,
  role_resource_id AS role_id,
  role_name AS role_name,
  status AS status,
  created_at AS created_at,
  updated_at AS updated_at
FROM __SCHEMA__.memberships;

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
  updated_at AS updated_at
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3RlbXBsYXRlLnNxbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztrQkFBZ0IiLCJmaWxlIjoidGVtcGxhdGUuc3FsLmpzIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGRlZmF1bHQgYFxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgX19TQ0hFTUFfXy5hdWRpbyAoXG4gIGlkIGJpZ3NlcmlhbCBOT1QgTlVMTCxcbiAgcm93X2lkIGJpZ2ludCBOT1QgTlVMTCxcbiAgcm93X3Jlc291cmNlX2lkIHRleHQgTk9UIE5VTEwsXG4gIGFjY2Vzc19rZXkgdGV4dCBOT1QgTlVMTCxcbiAgcmVjb3JkX2lkIGJpZ2ludCxcbiAgcmVjb3JkX3Jlc291cmNlX2lkIHRleHQsXG4gIGZvcm1faWQgYmlnaW50LFxuICBmb3JtX3Jlc291cmNlX2lkIHRleHQsXG4gIG1ldGFkYXRhIHRleHQsXG4gIGZpbGVfc2l6ZSBiaWdpbnQsXG4gIGNyZWF0ZWRfYnlfaWQgYmlnaW50LFxuICBjcmVhdGVkX2J5X3Jlc291cmNlX2lkIHRleHQsXG4gIHVwZGF0ZWRfYnlfaWQgYmlnaW50LFxuICB1cGRhdGVkX2J5X3Jlc291cmNlX2lkIHRleHQsXG4gIGNyZWF0ZWRfYXQgdGltZXN0YW1wIHdpdGggdGltZSB6b25lIE5PVCBOVUxMLFxuICB1cGRhdGVkX2F0IHRpbWVzdGFtcCB3aXRoIHRpbWUgem9uZSBOT1QgTlVMTCxcbiAgZmlsZSB0ZXh0LFxuICBjb250ZW50X3R5cGUgdGV4dCxcbiAgaXNfdXBsb2FkZWQgYm9vbGVhbiBOT1QgTlVMTCBERUZBVUxUIEZBTFNFLFxuICBpc19zdG9yZWQgYm9vbGVhbiBOT1QgTlVMTCBERUZBVUxUIEZBTFNFLFxuICBpc19wcm9jZXNzZWQgYm9vbGVhbiBOT1QgTlVMTCBERUZBVUxUIEZBTFNFLFxuICBoYXNfdHJhY2sgYm9vbGVhbixcbiAgdHJhY2sgdGV4dCxcbiAgZ2VvbWV0cnkgZ2VvbWV0cnkoR2VvbWV0cnksIDQzMjYpLFxuICBkdXJhdGlvbiBkb3VibGUgcHJlY2lzaW9uLFxuICBiaXRfcmF0ZSBkb3VibGUgcHJlY2lzaW9uLFxuICBDT05TVFJBSU5UIGF1ZGlvX3BrZXkgUFJJTUFSWSBLRVkgKGlkKVxuKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgX19TQ0hFTUFfXy5jaGFuZ2VzZXRzIChcbiAgaWQgYmlnc2VyaWFsIE5PVCBOVUxMLFxuICByb3dfaWQgYmlnaW50IE5PVCBOVUxMLFxuICByb3dfcmVzb3VyY2VfaWQgdGV4dCBOT1QgTlVMTCxcbiAgZm9ybV9pZCBiaWdpbnQgTk9UIE5VTEwsXG4gIGZvcm1fcmVzb3VyY2VfaWQgdGV4dCxcbiAgbWV0YWRhdGEgdGV4dCxcbiAgY2xvc2VkX2F0IHRpbWVzdGFtcCB3aXRoIHRpbWUgem9uZSxcbiAgY3JlYXRlZF9ieV9pZCBiaWdpbnQsXG4gIGNyZWF0ZWRfYnlfcmVzb3VyY2VfaWQgdGV4dCxcbiAgdXBkYXRlZF9ieV9pZCBiaWdpbnQsXG4gIHVwZGF0ZWRfYnlfcmVzb3VyY2VfaWQgdGV4dCxcbiAgY2xvc2VkX2J5X2lkIGJpZ2ludCxcbiAgY2xvc2VkX2J5X3Jlc291cmNlX2lkIHRleHQsXG4gIGNyZWF0ZWRfYXQgdGltZXN0YW1wIHdpdGggdGltZSB6b25lIE5PVCBOVUxMLFxuICB1cGRhdGVkX2F0IHRpbWVzdGFtcCB3aXRoIHRpbWUgem9uZSBOT1QgTlVMTCxcbiAgbWluX2xhdCBkb3VibGUgcHJlY2lzaW9uLFxuICBtYXhfbGF0IGRvdWJsZSBwcmVjaXNpb24sXG4gIG1pbl9sb24gZG91YmxlIHByZWNpc2lvbixcbiAgbWF4X2xvbiBkb3VibGUgcHJlY2lzaW9uLFxuICBudW1iZXJfb2ZfY2hhbmdlcyBiaWdpbnQsXG4gIG51bWJlcl9vZl9jcmVhdGVzIGJpZ2ludCxcbiAgbnVtYmVyX29mX3VwZGF0ZXMgYmlnaW50LFxuICBudW1iZXJfb2ZfZGVsZXRlcyBiaWdpbnQsXG4gIG1ldGFkYXRhX2luZGV4X3RleHQgdGV4dCxcbiAgbWV0YWRhdGFfaW5kZXggdHN2ZWN0b3IsXG4gIENPTlNUUkFJTlQgY2hhbmdlc2V0c19wa2V5IFBSSU1BUlkgS0VZIChpZClcbik7XG5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIF9fU0NIRU1BX18uY2hvaWNlX2xpc3RzIChcbiAgaWQgYmlnc2VyaWFsIE5PVCBOVUxMLFxuICByb3dfaWQgYmlnaW50IE5PVCBOVUxMLFxuICByb3dfcmVzb3VyY2VfaWQgdGV4dCBOT1QgTlVMTCxcbiAgbmFtZSB0ZXh0IE5PVCBOVUxMLFxuICBkZXNjcmlwdGlvbiB0ZXh0LFxuICB2ZXJzaW9uIGJpZ2ludCBOT1QgTlVMTCxcbiAgaXRlbXMgdGV4dCBOT1QgTlVMTCxcbiAgY3JlYXRlZF9ieV9pZCBiaWdpbnQsXG4gIGNyZWF0ZWRfYnlfcmVzb3VyY2VfaWQgdGV4dCxcbiAgdXBkYXRlZF9ieV9pZCBiaWdpbnQsXG4gIHVwZGF0ZWRfYnlfcmVzb3VyY2VfaWQgdGV4dCxcbiAgY3JlYXRlZF9hdCB0aW1lc3RhbXAgd2l0aCB0aW1lIHpvbmUgTk9UIE5VTEwsXG4gIHVwZGF0ZWRfYXQgdGltZXN0YW1wIHdpdGggdGltZSB6b25lIE5PVCBOVUxMLFxuICBDT05TVFJBSU5UIGNob2ljZV9saXN0c19wa2V5IFBSSU1BUlkgS0VZIChpZClcbik7XG5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIF9fU0NIRU1BX18uY2xhc3NpZmljYXRpb25fc2V0cyAoXG4gIGlkIGJpZ3NlcmlhbCBOT1QgTlVMTCxcbiAgcm93X2lkIGJpZ2ludCBOT1QgTlVMTCxcbiAgcm93X3Jlc291cmNlX2lkIHRleHQgTk9UIE5VTEwsXG4gIG5hbWUgdGV4dCBOT1QgTlVMTCxcbiAgZGVzY3JpcHRpb24gdGV4dCxcbiAgdmVyc2lvbiBiaWdpbnQgTk9UIE5VTEwsXG4gIGl0ZW1zIHRleHQgTk9UIE5VTEwsXG4gIGNyZWF0ZWRfYnlfaWQgYmlnaW50LFxuICBjcmVhdGVkX2J5X3Jlc291cmNlX2lkIHRleHQsXG4gIHVwZGF0ZWRfYnlfaWQgYmlnaW50LFxuICB1cGRhdGVkX2J5X3Jlc291cmNlX2lkIHRleHQsXG4gIGNyZWF0ZWRfYXQgdGltZXN0YW1wIHdpdGggdGltZSB6b25lIE5PVCBOVUxMLFxuICB1cGRhdGVkX2F0IHRpbWVzdGFtcCB3aXRoIHRpbWUgem9uZSBOT1QgTlVMTCxcbiAgQ09OU1RSQUlOVCBjbGFzc2lmaWNhdGlvbl9zZXRzX3BrZXkgUFJJTUFSWSBLRVkgKGlkKVxuKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgX19TQ0hFTUFfXy5mb3JtcyAoXG4gIGlkIGJpZ3NlcmlhbCBOT1QgTlVMTCxcbiAgcm93X2lkIGJpZ2ludCBOT1QgTlVMTCxcbiAgcm93X3Jlc291cmNlX2lkIHRleHQgTk9UIE5VTEwsXG4gIG5hbWUgdGV4dCBOT1QgTlVMTCxcbiAgZGVzY3JpcHRpb24gdGV4dCxcbiAgdmVyc2lvbiBiaWdpbnQgTk9UIE5VTEwsXG4gIGVsZW1lbnRzIHRleHQsXG4gIGJvdW5kaW5nX2JveCBnZW9tZXRyeShHZW9tZXRyeSwgNDMyNiksXG4gIHJlY29yZF9jb3VudCBiaWdpbnQgTk9UIE5VTEwgREVGQVVMVCAwLFxuICByZWNvcmRfY2hhbmdlZF9hdCB0aW1lc3RhbXAgd2l0aCB0aW1lIHpvbmUsXG4gIHJlY2VudF9sYXRfbG9uZ3MgdGV4dCxcbiAgc3RhdHVzIHRleHQsXG4gIHN0YXR1c19maWVsZCB0ZXh0LFxuICBjcmVhdGVkX2J5X2lkIGJpZ2ludCxcbiAgY3JlYXRlZF9ieV9yZXNvdXJjZV9pZCB0ZXh0LFxuICB1cGRhdGVkX2J5X2lkIGJpZ2ludCxcbiAgdXBkYXRlZF9ieV9yZXNvdXJjZV9pZCB0ZXh0LFxuICBjcmVhdGVkX2F0IHRpbWVzdGFtcCB3aXRoIHRpbWUgem9uZSBOT1QgTlVMTCxcbiAgdXBkYXRlZF9hdCB0aW1lc3RhbXAgd2l0aCB0aW1lIHpvbmUgTk9UIE5VTEwsXG4gIHBob3RvX3VzYWdlIGJpZ2ludCxcbiAgcGhvdG9fY291bnQgYmlnaW50LFxuICB2aWRlb191c2FnZSBiaWdpbnQsXG4gIHZpZGVvX2NvdW50IGJpZ2ludCxcbiAgYXVkaW9fdXNhZ2UgYmlnaW50LFxuICBhdWRpb19jb3VudCBiaWdpbnQsXG4gIHNpZ25hdHVyZV91c2FnZSBiaWdpbnQsXG4gIHNpZ25hdHVyZV9jb3VudCBiaWdpbnQsXG4gIG1lZGlhX3VzYWdlIGJpZ2ludCxcbiAgbWVkaWFfY291bnQgYmlnaW50LFxuICBhdXRvX2Fzc2lnbiBib29sZWFuIE5PVCBOVUxMLFxuICB0aXRsZV9maWVsZF9rZXlzIHRleHQsXG4gIGhpZGRlbl9vbl9kYXNoYm9hcmQgYm9vbGVhbiBOT1QgTlVMTCxcbiAgZ2VvbWV0cnlfdHlwZXMgdGV4dCxcbiAgZ2VvbWV0cnlfcmVxdWlyZWQgYm9vbGVhbiBOT1QgTlVMTCxcbiAgc2NyaXB0IHRleHQsXG4gIGltYWdlIHRleHQsXG4gIHByb2plY3RzX2VuYWJsZWQgYm9vbGVhbiBOT1QgTlVMTCxcbiAgYXNzaWdubWVudF9lbmFibGVkIGJvb2xlYW4gTk9UIE5VTEwsXG4gIENPTlNUUkFJTlQgZm9ybXNfcGtleSBQUklNQVJZIEtFWSAoaWQpXG4pO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBfX1NDSEVNQV9fLm1lbWJlcnNoaXBzIChcbiAgaWQgYmlnc2VyaWFsIE5PVCBOVUxMLFxuICByb3dfaWQgYmlnaW50IE5PVCBOVUxMLFxuICByb3dfcmVzb3VyY2VfaWQgdGV4dCBOT1QgTlVMTCxcbiAgdXNlcl9pZCBiaWdpbnQgTk9UIE5VTEwsXG4gIHVzZXJfcmVzb3VyY2VfaWQgdGV4dCxcbiAgZmlyc3RfbmFtZSB0ZXh0LFxuICBsYXN0X25hbWUgdGV4dCxcbiAgbmFtZSB0ZXh0LFxuICBlbWFpbCB0ZXh0LFxuICByb2xlX2lkIGJpZ2ludCBOT1QgTlVMTCxcbiAgcm9sZV9yZXNvdXJjZV9pZCB0ZXh0IE5PVCBOVUxMLFxuICByb2xlX25hbWUgdGV4dCBOT1QgTlVMTCxcbiAgc3RhdHVzIHRleHQsXG4gIGNyZWF0ZWRfYXQgdGltZXN0YW1wIHdpdGggdGltZSB6b25lIE5PVCBOVUxMLFxuICB1cGRhdGVkX2F0IHRpbWVzdGFtcCB3aXRoIHRpbWUgem9uZSBOT1QgTlVMTCxcbiAgQ09OU1RSQUlOVCBtZW1iZXJzaGlwc19wa2V5IFBSSU1BUlkgS0VZIChpZClcbik7XG5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIF9fU0NIRU1BX18ucGhvdG9zIChcbiAgaWQgYmlnc2VyaWFsIE5PVCBOVUxMLFxuICByb3dfaWQgYmlnaW50IE5PVCBOVUxMLFxuICByb3dfcmVzb3VyY2VfaWQgdGV4dCBOT1QgTlVMTCxcbiAgYWNjZXNzX2tleSB0ZXh0IE5PVCBOVUxMLFxuICByZWNvcmRfaWQgYmlnaW50LFxuICByZWNvcmRfcmVzb3VyY2VfaWQgdGV4dCxcbiAgZm9ybV9pZCBiaWdpbnQsXG4gIGZvcm1fcmVzb3VyY2VfaWQgdGV4dCxcbiAgZXhpZiB0ZXh0LFxuICBmaWxlX3NpemUgYmlnaW50LFxuICBjcmVhdGVkX2J5X2lkIGJpZ2ludCxcbiAgY3JlYXRlZF9ieV9yZXNvdXJjZV9pZCB0ZXh0LFxuICB1cGRhdGVkX2J5X2lkIGJpZ2ludCxcbiAgdXBkYXRlZF9ieV9yZXNvdXJjZV9pZCB0ZXh0LFxuICBjcmVhdGVkX2F0IHRpbWVzdGFtcCB3aXRoIHRpbWUgem9uZSBOT1QgTlVMTCxcbiAgdXBkYXRlZF9hdCB0aW1lc3RhbXAgd2l0aCB0aW1lIHpvbmUgTk9UIE5VTEwsXG4gIGZpbGUgdGV4dCxcbiAgY29udGVudF90eXBlIHRleHQsXG4gIGlzX3VwbG9hZGVkIGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBGQUxTRSxcbiAgaXNfc3RvcmVkIGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBGQUxTRSxcbiAgaXNfcHJvY2Vzc2VkIGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBGQUxTRSxcbiAgZ2VvbWV0cnkgZ2VvbWV0cnkoR2VvbWV0cnksIDQzMjYpLFxuICBsYXRpdHVkZSBkb3VibGUgcHJlY2lzaW9uLFxuICBsb25naXR1ZGUgZG91YmxlIHByZWNpc2lvbixcbiAgYWx0aXR1ZGUgZG91YmxlIHByZWNpc2lvbixcbiAgYWNjdXJhY3kgZG91YmxlIHByZWNpc2lvbixcbiAgZGlyZWN0aW9uIGRvdWJsZSBwcmVjaXNpb24sXG4gIHdpZHRoIGJpZ2ludCxcbiAgaGVpZ2h0IGJpZ2ludCxcbiAgbWFrZSB0ZXh0LFxuICBtb2RlbCB0ZXh0LFxuICBzb2Z0d2FyZSB0ZXh0LFxuICBkYXRlX3RpbWUgdGV4dCxcbiAgQ09OU1RSQUlOVCBwaG90b3NfcGtleSBQUklNQVJZIEtFWSAoaWQpXG4pO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBfX1NDSEVNQV9fLnByb2plY3RzIChcbiAgaWQgYmlnc2VyaWFsIE5PVCBOVUxMLFxuICByb3dfaWQgYmlnaW50IE5PVCBOVUxMLFxuICByb3dfcmVzb3VyY2VfaWQgdGV4dCBOT1QgTlVMTCxcbiAgbmFtZSB0ZXh0IE5PVCBOVUxMLFxuICBkZXNjcmlwdGlvbiB0ZXh0LFxuICBjcmVhdGVkX2J5X2lkIGJpZ2ludCxcbiAgY3JlYXRlZF9ieV9yZXNvdXJjZV9pZCB0ZXh0LFxuICBjcmVhdGVkX2F0IHRpbWVzdGFtcCB3aXRoIHRpbWUgem9uZSBOT1QgTlVMTCxcbiAgdXBkYXRlZF9hdCB0aW1lc3RhbXAgd2l0aCB0aW1lIHpvbmUgTk9UIE5VTEwsXG4gIGRlbGV0ZWRfYXQgdGltZXN0YW1wIHdpdGggdGltZSB6b25lLFxuICBDT05TVFJBSU5UIHByb2plY3RzX3BrZXkgUFJJTUFSWSBLRVkgKGlkKVxuKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgX19TQ0hFTUFfXy5yb2xlcyAoXG4gIGlkIGJpZ3NlcmlhbCBOT1QgTlVMTCxcbiAgcm93X2lkIGJpZ2ludCBOT1QgTlVMTCxcbiAgcm93X3Jlc291cmNlX2lkIHRleHQgTk9UIE5VTEwsXG4gIG5hbWUgdGV4dCBOT1QgTlVMTCxcbiAgZGVzY3JpcHRpb24gdGV4dCxcbiAgY3JlYXRlZF9ieV9pZCBiaWdpbnQsXG4gIGNyZWF0ZWRfYnlfcmVzb3VyY2VfaWQgdGV4dCxcbiAgdXBkYXRlZF9ieV9pZCBiaWdpbnQsXG4gIHVwZGF0ZWRfYnlfcmVzb3VyY2VfaWQgdGV4dCxcbiAgY3JlYXRlZF9hdCB0aW1lc3RhbXAgd2l0aCB0aW1lIHpvbmUgTk9UIE5VTEwsXG4gIHVwZGF0ZWRfYXQgdGltZXN0YW1wIHdpdGggdGltZSB6b25lIE5PVCBOVUxMLFxuICBpc19zeXN0ZW0gYm9vbGVhbiBOT1QgTlVMTCxcbiAgaXNfZGVmYXVsdCBib29sZWFuIE5PVCBOVUxMLFxuICBjYW5fbWFuYWdlX3N1YnNjcmlwdGlvbiBib29sZWFuIE5PVCBOVUxMIERFRkFVTFQgZmFsc2UsXG4gIGNhbl91cGRhdGVfb3JnYW5pemF0aW9uIGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBmYWxzZSxcbiAgY2FuX21hbmFnZV9tZW1iZXJzIGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBmYWxzZSxcbiAgY2FuX21hbmFnZV9yb2xlcyBib29sZWFuIE5PVCBOVUxMIERFRkFVTFQgZmFsc2UsXG4gIGNhbl9tYW5hZ2VfYXBwcyBib29sZWFuIE5PVCBOVUxMIERFRkFVTFQgZmFsc2UsXG4gIGNhbl9tYW5hZ2VfcHJvamVjdHMgYm9vbGVhbiBOT1QgTlVMTCBERUZBVUxUIGZhbHNlLFxuICBjYW5fbWFuYWdlX2Nob2ljZV9saXN0cyBib29sZWFuIE5PVCBOVUxMIERFRkFVTFQgZmFsc2UsXG4gIGNhbl9tYW5hZ2VfY2xhc3NpZmljYXRpb25fc2V0cyBib29sZWFuIE5PVCBOVUxMIERFRkFVTFQgZmFsc2UsXG4gIGNhbl9jcmVhdGVfcmVjb3JkcyBib29sZWFuIE5PVCBOVUxMIERFRkFVTFQgZmFsc2UsXG4gIGNhbl91cGRhdGVfcmVjb3JkcyBib29sZWFuIE5PVCBOVUxMIERFRkFVTFQgZmFsc2UsXG4gIGNhbl9kZWxldGVfcmVjb3JkcyBib29sZWFuIE5PVCBOVUxMIERFRkFVTFQgZmFsc2UsXG4gIGNhbl9jaGFuZ2Vfc3RhdHVzIGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBmYWxzZSxcbiAgY2FuX2NoYW5nZV9wcm9qZWN0IGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBmYWxzZSxcbiAgY2FuX2Fzc2lnbl9yZWNvcmRzIGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBmYWxzZSxcbiAgY2FuX2ltcG9ydF9yZWNvcmRzIGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBmYWxzZSxcbiAgY2FuX2V4cG9ydF9yZWNvcmRzIGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBmYWxzZSxcbiAgY2FuX3J1bl9yZXBvcnRzIGJvb2xlYW4gTk9UIE5VTEwgREVGQVVMVCBmYWxzZSxcbiAgY2FuX21hbmFnZV9hdXRob3JpemF0aW9ucyBib29sZWFuIE5PVCBOVUxMIERFRkFVTFQgZmFsc2UsXG4gIENPTlNUUkFJTlQgcm9sZXNfcGtleSBQUklNQVJZIEtFWSAoaWQpXG4pO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBfX1NDSEVNQV9fLnNpZ25hdHVyZXMgKFxuICBpZCBiaWdzZXJpYWwgTk9UIE5VTEwsXG4gIHJvd19pZCBiaWdpbnQgTk9UIE5VTEwsXG4gIHJvd19yZXNvdXJjZV9pZCB0ZXh0IE5PVCBOVUxMLFxuICBhY2Nlc3Nfa2V5IHRleHQgTk9UIE5VTEwsXG4gIHJlY29yZF9pZCBiaWdpbnQsXG4gIHJlY29yZF9yZXNvdXJjZV9pZCB0ZXh0LFxuICBmb3JtX2lkIGJpZ2ludCxcbiAgZm9ybV9yZXNvdXJjZV9pZCB0ZXh0LFxuICBleGlmIHRleHQsXG4gIGZpbGVfc2l6ZSBiaWdpbnQsXG4gIGNyZWF0ZWRfYnlfaWQgYmlnaW50LFxuICBjcmVhdGVkX2J5X3Jlc291cmNlX2lkIHRleHQsXG4gIHVwZGF0ZWRfYnlfaWQgYmlnaW50LFxuICB1cGRhdGVkX2J5X3Jlc291cmNlX2lkIHRleHQsXG4gIGNyZWF0ZWRfYXQgdGltZXN0YW1wIHdpdGggdGltZSB6b25lIE5PVCBOVUxMLFxuICB1cGRhdGVkX2F0IHRpbWVzdGFtcCB3aXRoIHRpbWUgem9uZSBOT1QgTlVMTCxcbiAgZmlsZSB0ZXh0LFxuICBjb250ZW50X3R5cGUgdGV4dCxcbiAgaXNfdXBsb2FkZWQgYm9vbGVhbiBOT1QgTlVMTCBERUZBVUxUIEZBTFNFLFxuICBpc19zdG9yZWQgYm9vbGVhbiBOT1QgTlVMTCBERUZBVUxUIEZBTFNFLFxuICBpc19wcm9jZXNzZWQgYm9vbGVhbiBOT1QgTlVMTCBERUZBVUxUIEZBTFNFLFxuICBDT05TVFJBSU5UIHNpZ25hdHVyZXNfcGtleSBQUklNQVJZIEtFWSAoaWQpXG4pO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBfX1NDSEVNQV9fLnZpZGVvcyAoXG4gIGlkIGJpZ3NlcmlhbCBOT1QgTlVMTCxcbiAgcm93X2lkIGJpZ2ludCBOT1QgTlVMTCxcbiAgcm93X3Jlc291cmNlX2lkIHRleHQgTk9UIE5VTEwsXG4gIGFjY2Vzc19rZXkgdGV4dCBOT1QgTlVMTCxcbiAgcmVjb3JkX2lkIGJpZ2ludCxcbiAgcmVjb3JkX3Jlc291cmNlX2lkIHRleHQsXG4gIGZvcm1faWQgYmlnaW50LFxuICBmb3JtX3Jlc291cmNlX2lkIHRleHQsXG4gIG1ldGFkYXRhIHRleHQsXG4gIGZpbGVfc2l6ZSBiaWdpbnQsXG4gIGNyZWF0ZWRfYnlfaWQgYmlnaW50LFxuICBjcmVhdGVkX2J5X3Jlc291cmNlX2lkIHRleHQsXG4gIHVwZGF0ZWRfYnlfaWQgYmlnaW50LFxuICB1cGRhdGVkX2J5X3Jlc291cmNlX2lkIHRleHQsXG4gIGNyZWF0ZWRfYXQgdGltZXN0YW1wIHdpdGggdGltZSB6b25lIE5PVCBOVUxMLFxuICB1cGRhdGVkX2F0IHRpbWVzdGFtcCB3aXRoIHRpbWUgem9uZSBOT1QgTlVMTCxcbiAgZmlsZSB0ZXh0LFxuICBjb250ZW50X3R5cGUgdGV4dCxcbiAgaXNfdXBsb2FkZWQgYm9vbGVhbiBOT1QgTlVMTCBERUZBVUxUIEZBTFNFLFxuICBpc19zdG9yZWQgYm9vbGVhbiBOT1QgTlVMTCBERUZBVUxUIEZBTFNFLFxuICBpc19wcm9jZXNzZWQgYm9vbGVhbiBOT1QgTlVMTCBERUZBVUxUIEZBTFNFLFxuICBoYXNfdHJhY2sgYm9vbGVhbixcbiAgdHJhY2sgdGV4dCxcbiAgZ2VvbWV0cnkgZ2VvbWV0cnkoR2VvbWV0cnksIDQzMjYpLFxuICB3aWR0aCBiaWdpbnQsXG4gIGhlaWdodCBiaWdpbnQsXG4gIGR1cmF0aW9uIGRvdWJsZSBwcmVjaXNpb24sXG4gIGJpdF9yYXRlIGRvdWJsZSBwcmVjaXNpb24sXG4gIENPTlNUUkFJTlQgdmlkZW9zX3BrZXkgUFJJTUFSWSBLRVkgKGlkKVxuKTtcblxuRFJPUCBWSUVXIElGIEVYSVNUUyBfX1ZJRVdfU0NIRU1BX18uYXVkaW9fdmlldztcblxuQ1JFQVRFIE9SIFJFUExBQ0UgVklFVyBfX1ZJRVdfU0NIRU1BX18uYXVkaW9fdmlldyBBU1xuU0VMRUNUXG4gIGFjY2Vzc19rZXkgQVMgYXVkaW9faWQsXG4gIHJlY29yZF9yZXNvdXJjZV9pZCBBUyByZWNvcmRfaWQsXG4gIGZvcm1fcmVzb3VyY2VfaWQgQVMgZm9ybV9pZCxcbiAgbWV0YWRhdGEgQVMgbWV0YWRhdGEsXG4gIGZpbGVfc2l6ZSBBUyBmaWxlX3NpemUsXG4gIGNyZWF0ZWRfYnlfcmVzb3VyY2VfaWQgQVMgY3JlYXRlZF9ieV9pZCxcbiAgdXBkYXRlZF9ieV9yZXNvdXJjZV9pZCBBUyB1cGRhdGVkX2J5X2lkLFxuICBjcmVhdGVkX2F0IEFTIGNyZWF0ZWRfYXQsXG4gIHVwZGF0ZWRfYXQgQVMgdXBkYXRlZF9hdCxcbiAgZmlsZSBBUyBmaWxlLFxuICBjb250ZW50X3R5cGUgQVMgY29udGVudF90eXBlLFxuICBpc191cGxvYWRlZCBBUyBpc191cGxvYWRlZCxcbiAgaXNfc3RvcmVkIEFTIGlzX3N0b3JlZCxcbiAgaXNfcHJvY2Vzc2VkIEFTIGlzX3Byb2Nlc3NlZCxcbiAgaGFzX3RyYWNrIEFTIGhhc190cmFjayxcbiAgdHJhY2sgQVMgdHJhY2ssXG4gIGdlb21ldHJ5IEFTIGdlb21ldHJ5LFxuICBkdXJhdGlvbiBBUyBkdXJhdGlvbixcbiAgYml0X3JhdGUgQVMgYml0X3JhdGVcbkZST00gX19TQ0hFTUFfXy5hdWRpbztcblxuRFJPUCBWSUVXIElGIEVYSVNUUyBfX1ZJRVdfU0NIRU1BX18uY2hhbmdlc2V0c192aWV3O1xuXG5DUkVBVEUgT1IgUkVQTEFDRSBWSUVXIF9fVklFV19TQ0hFTUFfXy5jaGFuZ2VzZXRzX3ZpZXcgQVNcblNFTEVDVFxuICByb3dfcmVzb3VyY2VfaWQgQVMgY2hhbmdlc2V0X2lkLFxuICBmb3JtX3Jlc291cmNlX2lkIEFTIGZvcm1faWQsXG4gIG1ldGFkYXRhIEFTIG1ldGFkYXRhLFxuICBjbG9zZWRfYXQgQVMgY2xvc2VkX2F0LFxuICBjcmVhdGVkX2J5X3Jlc291cmNlX2lkIEFTIGNyZWF0ZWRfYnlfaWQsXG4gIHVwZGF0ZWRfYnlfcmVzb3VyY2VfaWQgQVMgdXBkYXRlZF9ieV9pZCxcbiAgY2xvc2VkX2J5X3Jlc291cmNlX2lkIEFTIGNsb3NlZF9ieV9pZCxcbiAgY3JlYXRlZF9hdCBBUyBjcmVhdGVkX2F0LFxuICB1cGRhdGVkX2F0IEFTIHVwZGF0ZWRfYXQsXG4gIG1pbl9sYXQgQVMgbWluX2xhdCxcbiAgbWF4X2xhdCBBUyBtYXhfbGF0LFxuICBtaW5fbG9uIEFTIG1pbl9sb24sXG4gIG1heF9sb24gQVMgbWF4X2xvbixcbiAgbnVtYmVyX29mX2NoYW5nZXMgQVMgbnVtYmVyX29mX2NoYW5nZXMsXG4gIG51bWJlcl9vZl9jcmVhdGVzIEFTIG51bWJlcl9vZl9jcmVhdGVzLFxuICBudW1iZXJfb2ZfdXBkYXRlcyBBUyBudW1iZXJfb2ZfdXBkYXRlcyxcbiAgbnVtYmVyX29mX2RlbGV0ZXMgQVMgbnVtYmVyX29mX2RlbGV0ZXMsXG4gIG1ldGFkYXRhX2luZGV4IEFTIG1ldGFkYXRhX2luZGV4XG5GUk9NIF9fU0NIRU1BX18uY2hhbmdlc2V0cztcblxuRFJPUCBWSUVXIElGIEVYSVNUUyBfX1ZJRVdfU0NIRU1BX18uY2hvaWNlX2xpc3RzX3ZpZXc7XG5cbkNSRUFURSBPUiBSRVBMQUNFIFZJRVcgX19WSUVXX1NDSEVNQV9fLmNob2ljZV9saXN0c192aWV3IEFTXG5TRUxFQ1RcbiAgcm93X3Jlc291cmNlX2lkIEFTIGNob2ljZV9saXN0X2lkLFxuICBuYW1lIEFTIG5hbWUsXG4gIGRlc2NyaXB0aW9uIEFTIGRlc2NyaXB0aW9uLFxuICB2ZXJzaW9uIEFTIHZlcnNpb24sXG4gIGl0ZW1zIEFTIGl0ZW1zLFxuICBjcmVhdGVkX2J5X3Jlc291cmNlX2lkIEFTIGNyZWF0ZWRfYnlfaWQsXG4gIHVwZGF0ZWRfYnlfcmVzb3VyY2VfaWQgQVMgdXBkYXRlZF9ieV9pZCxcbiAgY3JlYXRlZF9hdCBBUyBjcmVhdGVkX2F0LFxuICB1cGRhdGVkX2F0IEFTIHVwZGF0ZWRfYXRcbkZST00gX19TQ0hFTUFfXy5jaG9pY2VfbGlzdHM7XG5cbkRST1AgVklFVyBJRiBFWElTVFMgX19WSUVXX1NDSEVNQV9fLmNsYXNzaWZpY2F0aW9uX3NldHNfdmlldztcblxuQ1JFQVRFIE9SIFJFUExBQ0UgVklFVyBfX1ZJRVdfU0NIRU1BX18uY2xhc3NpZmljYXRpb25fc2V0c192aWV3IEFTXG5TRUxFQ1RcbiAgcm93X3Jlc291cmNlX2lkIEFTIGNsYXNzaWZpY2F0aW9uX3NldF9pZCxcbiAgbmFtZSBBUyBuYW1lLFxuICBkZXNjcmlwdGlvbiBBUyBkZXNjcmlwdGlvbixcbiAgdmVyc2lvbiBBUyB2ZXJzaW9uLFxuICBpdGVtcyBBUyBpdGVtcyxcbiAgY3JlYXRlZF9ieV9yZXNvdXJjZV9pZCBBUyBjcmVhdGVkX2J5X2lkLFxuICB1cGRhdGVkX2J5X3Jlc291cmNlX2lkIEFTIHVwZGF0ZWRfYnlfaWQsXG4gIGNyZWF0ZWRfYXQgQVMgY3JlYXRlZF9hdCxcbiAgdXBkYXRlZF9hdCBBUyB1cGRhdGVkX2F0XG5GUk9NIF9fU0NIRU1BX18uY2xhc3NpZmljYXRpb25fc2V0cztcblxuRFJPUCBWSUVXIElGIEVYSVNUUyBfX1ZJRVdfU0NIRU1BX18uZm9ybXNfdmlldztcblxuQ1JFQVRFIE9SIFJFUExBQ0UgVklFVyBfX1ZJRVdfU0NIRU1BX18uZm9ybXNfdmlldyBBU1xuU0VMRUNUXG4gIHJvd19yZXNvdXJjZV9pZCBBUyBmb3JtX2lkLFxuICBuYW1lIEFTIG5hbWUsXG4gIGRlc2NyaXB0aW9uIEFTIGRlc2NyaXB0aW9uLFxuICB2ZXJzaW9uIEFTIHZlcnNpb24sXG4gIGVsZW1lbnRzIEFTIGVsZW1lbnRzLFxuICBib3VuZGluZ19ib3ggQVMgYm91bmRpbmdfYm94LFxuICBzdGF0dXMgQVMgc3RhdHVzLFxuICBzdGF0dXNfZmllbGQgQVMgc3RhdHVzX2ZpZWxkLFxuICBjcmVhdGVkX2J5X3Jlc291cmNlX2lkIEFTIGNyZWF0ZWRfYnlfaWQsXG4gIHVwZGF0ZWRfYnlfcmVzb3VyY2VfaWQgQVMgdXBkYXRlZF9ieV9pZCxcbiAgY3JlYXRlZF9hdCBBUyBjcmVhdGVkX2F0LFxuICB1cGRhdGVkX2F0IEFTIHVwZGF0ZWRfYXQsXG4gIGF1dG9fYXNzaWduIEFTIGF1dG9fYXNzaWduLFxuICB0aXRsZV9maWVsZF9rZXlzIEFTIHRpdGxlX2ZpZWxkX2tleXMsXG4gIGhpZGRlbl9vbl9kYXNoYm9hcmQgQVMgaGlkZGVuX29uX2Rhc2hib2FyZCxcbiAgZ2VvbWV0cnlfdHlwZXMgQVMgZ2VvbWV0cnlfdHlwZXMsXG4gIGdlb21ldHJ5X3JlcXVpcmVkIEFTIGdlb21ldHJ5X3JlcXVpcmVkLFxuICBzY3JpcHQgQVMgc2NyaXB0LFxuICBpbWFnZSBBUyBpbWFnZSxcbiAgcHJvamVjdHNfZW5hYmxlZCBBUyBwcm9qZWN0c19lbmFibGVkLFxuICBhc3NpZ25tZW50X2VuYWJsZWQgQVMgYXNzaWdubWVudF9lbmFibGVkXG5GUk9NIF9fU0NIRU1BX18uZm9ybXM7XG5cbkRST1AgVklFVyBJRiBFWElTVFMgX19WSUVXX1NDSEVNQV9fLm1lbWJlcnNoaXBzX3ZpZXc7XG5cbkNSRUFURSBPUiBSRVBMQUNFIFZJRVcgX19WSUVXX1NDSEVNQV9fLm1lbWJlcnNoaXBzX3ZpZXcgQVNcblNFTEVDVFxuICByb3dfcmVzb3VyY2VfaWQgQVMgbWVtYmVyc2hpcF9pZCxcbiAgdXNlcl9yZXNvdXJjZV9pZCBBUyB1c2VyX2lkLFxuICBmaXJzdF9uYW1lIEFTIGZpcnN0X25hbWUsXG4gIGxhc3RfbmFtZSBBUyBsYXN0X25hbWUsXG4gIG5hbWUgQVMgbmFtZSxcbiAgZW1haWwgQVMgZW1haWwsXG4gIHJvbGVfcmVzb3VyY2VfaWQgQVMgcm9sZV9pZCxcbiAgcm9sZV9uYW1lIEFTIHJvbGVfbmFtZSxcbiAgc3RhdHVzIEFTIHN0YXR1cyxcbiAgY3JlYXRlZF9hdCBBUyBjcmVhdGVkX2F0LFxuICB1cGRhdGVkX2F0IEFTIHVwZGF0ZWRfYXRcbkZST00gX19TQ0hFTUFfXy5tZW1iZXJzaGlwcztcblxuRFJPUCBWSUVXIElGIEVYSVNUUyBfX1ZJRVdfU0NIRU1BX18ucGhvdG9zX3ZpZXc7XG5cbkNSRUFURSBPUiBSRVBMQUNFIFZJRVcgX19WSUVXX1NDSEVNQV9fLnBob3Rvc192aWV3IEFTXG5TRUxFQ1RcbiAgYWNjZXNzX2tleSBBUyBwaG90b19pZCxcbiAgcmVjb3JkX3Jlc291cmNlX2lkIEFTIHJlY29yZF9pZCxcbiAgZm9ybV9yZXNvdXJjZV9pZCBBUyBmb3JtX2lkLFxuICBleGlmIEFTIGV4aWYsXG4gIGZpbGVfc2l6ZSBBUyBmaWxlX3NpemUsXG4gIGNyZWF0ZWRfYnlfcmVzb3VyY2VfaWQgQVMgY3JlYXRlZF9ieV9pZCxcbiAgdXBkYXRlZF9ieV9yZXNvdXJjZV9pZCBBUyB1cGRhdGVkX2J5X2lkLFxuICBjcmVhdGVkX2F0IEFTIGNyZWF0ZWRfYXQsXG4gIHVwZGF0ZWRfYXQgQVMgdXBkYXRlZF9hdCxcbiAgZmlsZSBBUyBmaWxlLFxuICBjb250ZW50X3R5cGUgQVMgY29udGVudF90eXBlLFxuICBpc191cGxvYWRlZCBBUyBpc191cGxvYWRlZCxcbiAgaXNfc3RvcmVkIEFTIGlzX3N0b3JlZCxcbiAgaXNfcHJvY2Vzc2VkIEFTIGlzX3Byb2Nlc3NlZCxcbiAgZ2VvbWV0cnkgQVMgZ2VvbWV0cnksXG4gIGxhdGl0dWRlIEFTIGxhdGl0dWRlLFxuICBsb25naXR1ZGUgQVMgbG9uZ2l0dWRlLFxuICBhbHRpdHVkZSBBUyBhbHRpdHVkZSxcbiAgYWNjdXJhY3kgQVMgYWNjdXJhY3ksXG4gIGRpcmVjdGlvbiBBUyBkaXJlY3Rpb24sXG4gIHdpZHRoIEFTIHdpZHRoLFxuICBoZWlnaHQgQVMgaGVpZ2h0LFxuICBtYWtlIEFTIG1ha2UsXG4gIG1vZGVsIEFTIG1vZGVsLFxuICBzb2Z0d2FyZSBBUyBzb2Z0d2FyZSxcbiAgZGF0ZV90aW1lIEFTIGRhdGVfdGltZVxuRlJPTSBfX1NDSEVNQV9fLnBob3RvcztcblxuRFJPUCBWSUVXIElGIEVYSVNUUyBfX1ZJRVdfU0NIRU1BX18ucHJvamVjdHNfdmlldztcblxuQ1JFQVRFIE9SIFJFUExBQ0UgVklFVyBfX1ZJRVdfU0NIRU1BX18ucHJvamVjdHNfdmlldyBBU1xuU0VMRUNUXG4gIHJvd19yZXNvdXJjZV9pZCBBUyBwcm9qZWN0X2lkLFxuICBuYW1lIEFTIG5hbWUsXG4gIGRlc2NyaXB0aW9uIEFTIGRlc2NyaXB0aW9uLFxuICBjcmVhdGVkX2J5X3Jlc291cmNlX2lkIEFTIGNyZWF0ZWRfYnlfaWQsXG4gIGNyZWF0ZWRfYXQgQVMgY3JlYXRlZF9hdCxcbiAgdXBkYXRlZF9hdCBBUyB1cGRhdGVkX2F0XG5GUk9NIF9fU0NIRU1BX18ucHJvamVjdHM7XG5cbkRST1AgVklFVyBJRiBFWElTVFMgX19WSUVXX1NDSEVNQV9fLnJvbGVzX3ZpZXc7XG5cbkNSRUFURSBPUiBSRVBMQUNFIFZJRVcgX19WSUVXX1NDSEVNQV9fLnJvbGVzX3ZpZXcgQVNcblNFTEVDVFxuICByb3dfcmVzb3VyY2VfaWQgQVMgcm9sZV9pZCxcbiAgbmFtZSBBUyBuYW1lLFxuICBkZXNjcmlwdGlvbiBBUyBkZXNjcmlwdGlvbixcbiAgY3JlYXRlZF9ieV9yZXNvdXJjZV9pZCBBUyBjcmVhdGVkX2J5X2lkLFxuICB1cGRhdGVkX2J5X3Jlc291cmNlX2lkIEFTIHVwZGF0ZWRfYnlfaWQsXG4gIGNyZWF0ZWRfYXQgQVMgY3JlYXRlZF9hdCxcbiAgdXBkYXRlZF9hdCBBUyB1cGRhdGVkX2F0LFxuICBpc19zeXN0ZW0gQVMgaXNfc3lzdGVtLFxuICBpc19kZWZhdWx0IEFTIGlzX2RlZmF1bHQsXG4gIGNhbl9tYW5hZ2Vfc3Vic2NyaXB0aW9uIEFTIGNhbl9tYW5hZ2Vfc3Vic2NyaXB0aW9uLFxuICBjYW5fdXBkYXRlX29yZ2FuaXphdGlvbiBBUyBjYW5fdXBkYXRlX29yZ2FuaXphdGlvbixcbiAgY2FuX21hbmFnZV9tZW1iZXJzIEFTIGNhbl9tYW5hZ2VfbWVtYmVycyxcbiAgY2FuX21hbmFnZV9yb2xlcyBBUyBjYW5fbWFuYWdlX3JvbGVzLFxuICBjYW5fbWFuYWdlX2FwcHMgQVMgY2FuX21hbmFnZV9hcHBzLFxuICBjYW5fbWFuYWdlX3Byb2plY3RzIEFTIGNhbl9tYW5hZ2VfcHJvamVjdHMsXG4gIGNhbl9tYW5hZ2VfY2hvaWNlX2xpc3RzIEFTIGNhbl9tYW5hZ2VfY2hvaWNlX2xpc3RzLFxuICBjYW5fbWFuYWdlX2NsYXNzaWZpY2F0aW9uX3NldHMgQVMgY2FuX21hbmFnZV9jbGFzc2lmaWNhdGlvbl9zZXRzLFxuICBjYW5fY3JlYXRlX3JlY29yZHMgQVMgY2FuX2NyZWF0ZV9yZWNvcmRzLFxuICBjYW5fdXBkYXRlX3JlY29yZHMgQVMgY2FuX3VwZGF0ZV9yZWNvcmRzLFxuICBjYW5fZGVsZXRlX3JlY29yZHMgQVMgY2FuX2RlbGV0ZV9yZWNvcmRzLFxuICBjYW5fY2hhbmdlX3N0YXR1cyBBUyBjYW5fY2hhbmdlX3N0YXR1cyxcbiAgY2FuX2NoYW5nZV9wcm9qZWN0IEFTIGNhbl9jaGFuZ2VfcHJvamVjdCxcbiAgY2FuX2Fzc2lnbl9yZWNvcmRzIEFTIGNhbl9hc3NpZ25fcmVjb3JkcyxcbiAgY2FuX2ltcG9ydF9yZWNvcmRzIEFTIGNhbl9pbXBvcnRfcmVjb3JkcyxcbiAgY2FuX2V4cG9ydF9yZWNvcmRzIEFTIGNhbl9leHBvcnRfcmVjb3JkcyxcbiAgY2FuX3J1bl9yZXBvcnRzIEFTIGNhbl9ydW5fcmVwb3J0cyxcbiAgY2FuX21hbmFnZV9hdXRob3JpemF0aW9ucyBBUyBjYW5fbWFuYWdlX2F1dGhvcml6YXRpb25zXG5GUk9NIF9fU0NIRU1BX18ucm9sZXM7XG5cbkRST1AgVklFVyBJRiBFWElTVFMgX19WSUVXX1NDSEVNQV9fLnNpZ25hdHVyZXNfdmlldztcblxuQ1JFQVRFIE9SIFJFUExBQ0UgVklFVyBfX1ZJRVdfU0NIRU1BX18uc2lnbmF0dXJlc192aWV3IEFTXG5TRUxFQ1RcbiAgYWNjZXNzX2tleSBBUyBzaWduYXR1cmVfaWQsXG4gIHJlY29yZF9yZXNvdXJjZV9pZCBBUyByZWNvcmRfaWQsXG4gIGZvcm1fcmVzb3VyY2VfaWQgQVMgZm9ybV9pZCxcbiAgZmlsZV9zaXplIEFTIGZpbGVfc2l6ZSxcbiAgY3JlYXRlZF9ieV9yZXNvdXJjZV9pZCBBUyBjcmVhdGVkX2J5X2lkLFxuICB1cGRhdGVkX2J5X3Jlc291cmNlX2lkIEFTIHVwZGF0ZWRfYnlfaWQsXG4gIGNyZWF0ZWRfYXQgQVMgY3JlYXRlZF9hdCxcbiAgdXBkYXRlZF9hdCBBUyB1cGRhdGVkX2F0LFxuICBmaWxlIEFTIGZpbGUsXG4gIGNvbnRlbnRfdHlwZSBBUyBjb250ZW50X3R5cGUsXG4gIGlzX3VwbG9hZGVkIEFTIGlzX3VwbG9hZGVkLFxuICBpc19zdG9yZWQgQVMgaXNfc3RvcmVkLFxuICBpc19wcm9jZXNzZWQgQVMgaXNfcHJvY2Vzc2VkXG5GUk9NIF9fU0NIRU1BX18uc2lnbmF0dXJlcztcblxuRFJPUCBWSUVXIElGIEVYSVNUUyBfX1ZJRVdfU0NIRU1BX18udmlkZW9zX3ZpZXc7XG5cbkNSRUFURSBPUiBSRVBMQUNFIFZJRVcgX19WSUVXX1NDSEVNQV9fLnZpZGVvc192aWV3IEFTXG5TRUxFQ1RcbiAgYWNjZXNzX2tleSBBUyB2aWRlb19pZCxcbiAgcmVjb3JkX3Jlc291cmNlX2lkIEFTIHJlY29yZF9pZCxcbiAgZm9ybV9yZXNvdXJjZV9pZCBBUyBmb3JtX2lkLFxuICBtZXRhZGF0YSBBUyBtZXRhZGF0YSxcbiAgZmlsZV9zaXplIEFTIGZpbGVfc2l6ZSxcbiAgY3JlYXRlZF9ieV9yZXNvdXJjZV9pZCBBUyBjcmVhdGVkX2J5X2lkLFxuICB1cGRhdGVkX2J5X3Jlc291cmNlX2lkIEFTIHVwZGF0ZWRfYnlfaWQsXG4gIGNyZWF0ZWRfYXQgQVMgY3JlYXRlZF9hdCxcbiAgdXBkYXRlZF9hdCBBUyB1cGRhdGVkX2F0LFxuICBmaWxlIEFTIGZpbGUsXG4gIGNvbnRlbnRfdHlwZSBBUyBjb250ZW50X3R5cGUsXG4gIGlzX3VwbG9hZGVkIEFTIGlzX3VwbG9hZGVkLFxuICBpc19zdG9yZWQgQVMgaXNfc3RvcmVkLFxuICBpc19wcm9jZXNzZWQgQVMgaXNfcHJvY2Vzc2VkLFxuICBoYXNfdHJhY2sgQVMgaGFzX3RyYWNrLFxuICB0cmFjayBBUyB0cmFjayxcbiAgZ2VvbWV0cnkgQVMgZ2VvbWV0cnksXG4gIHdpZHRoIEFTIHdpZHRoLFxuICBoZWlnaHQgQVMgaGVpZ2h0LFxuICBkdXJhdGlvbiBBUyBkdXJhdGlvbixcbiAgYml0X3JhdGUgQVMgYml0X3JhdGVcbkZST00gX19TQ0hFTUFfXy52aWRlb3M7XG5cbkNSRUFURSBVTklRVUUgSU5ERVggaWR4X2F1ZGlvX3Jvd19yZXNvdXJjZV9pZCBPTiBfX1NDSEVNQV9fLmF1ZGlvIFVTSU5HIGJ0cmVlIChyb3dfcmVzb3VyY2VfaWQpO1xuXG5DUkVBVEUgVU5JUVVFIElOREVYIGlkeF9hdWRpb19yb3dfaWQgT04gX19TQ0hFTUFfXy5hdWRpbyBVU0lORyBidHJlZSAocm93X2lkKTtcblxuQ1JFQVRFIElOREVYIGlkeF9hdWRpb19hY2Nlc3Nfa2V5IE9OIF9fU0NIRU1BX18uYXVkaW8gVVNJTkcgYnRyZWUgKGFjY2Vzc19rZXkpO1xuXG5DUkVBVEUgSU5ERVggaWR4X2F1ZGlvX3JlY29yZF9yZXNvdXJjZV9pZCBPTiBfX1NDSEVNQV9fLmF1ZGlvIFVTSU5HIGJ0cmVlIChyZWNvcmRfcmVzb3VyY2VfaWQpO1xuXG5DUkVBVEUgSU5ERVggaWR4X2F1ZGlvX2Zvcm1fcmVzb3VyY2VfaWQgT04gX19TQ0hFTUFfXy5hdWRpbyBVU0lORyBidHJlZSAoZm9ybV9yZXNvdXJjZV9pZCk7XG5cbkNSRUFURSBJTkRFWCBpZHhfYXVkaW9fY3JlYXRlZF9ieV9yZXNvdXJjZV9pZCBPTiBfX1NDSEVNQV9fLmF1ZGlvIFVTSU5HIGJ0cmVlIChjcmVhdGVkX2J5X3Jlc291cmNlX2lkKTtcblxuQ1JFQVRFIElOREVYIGlkeF9hdWRpb19nZW9tZXRyeSBPTiBfX1NDSEVNQV9fLmF1ZGlvIFVTSU5HIGdpc3QgKGdlb21ldHJ5KTtcblxuQ1JFQVRFIElOREVYIGlkeF9hdWRpb191cGRhdGVkX2F0IE9OIF9fU0NIRU1BX18uYXVkaW8gVVNJTkcgYnRyZWUgKHVwZGF0ZWRfYXQpO1xuXG5DUkVBVEUgVU5JUVVFIElOREVYIGlkeF9jaGFuZ2VzZXRzX3Jvd19yZXNvdXJjZV9pZCBPTiBfX1NDSEVNQV9fLmNoYW5nZXNldHMgVVNJTkcgYnRyZWUgKHJvd19yZXNvdXJjZV9pZCk7XG5cbkNSRUFURSBVTklRVUUgSU5ERVggaWR4X2NoYW5nZXNldHNfcm93X2lkIE9OIF9fU0NIRU1BX18uY2hhbmdlc2V0cyBVU0lORyBidHJlZSAocm93X2lkKTtcblxuQ1JFQVRFIElOREVYIGlkeF9jaGFuZ2VzZXRzX2Zvcm1faWQgT04gX19TQ0hFTUFfXy5jaGFuZ2VzZXRzIFVTSU5HIGJ0cmVlIChmb3JtX2lkKTtcblxuQ1JFQVRFIElOREVYIGlkeF9jaGFuZ2VzZXRzX21ldGFkYXRhX2luZGV4IE9OIF9fU0NIRU1BX18uY2hhbmdlc2V0cyBVU0lORyBnaW4gKG1ldGFkYXRhX2luZGV4KSBXSVRIIChmYXN0dXBkYXRlID0gb2ZmKTtcblxuQ1JFQVRFIElOREVYIGlkeF9jaGFuZ2VzZXRzX2Zvcm1faWRfdXBkYXRlZF9hdCBPTiBfX1NDSEVNQV9fLmNoYW5nZXNldHMgVVNJTkcgYnRyZWUgKGZvcm1faWQsIHVwZGF0ZWRfYXQpO1xuXG5DUkVBVEUgSU5ERVggaWR4X2NoYW5nZXNldHNfdXBkYXRlZF9hdCBPTiBfX1NDSEVNQV9fLmNoYW5nZXNldHMgVVNJTkcgYnRyZWUgKHVwZGF0ZWRfYXQpO1xuXG5DUkVBVEUgVU5JUVVFIElOREVYIGlkeF9jaG9pY2VfbGlzdHNfcm93X3Jlc291cmNlX2lkIE9OIF9fU0NIRU1BX18uY2hvaWNlX2xpc3RzIFVTSU5HIGJ0cmVlIChyb3dfcmVzb3VyY2VfaWQpO1xuXG5DUkVBVEUgVU5JUVVFIElOREVYIGlkeF9jaG9pY2VfbGlzdHNfcm93X2lkIE9OIF9fU0NIRU1BX18uY2hvaWNlX2xpc3RzIFVTSU5HIGJ0cmVlIChyb3dfaWQpO1xuXG5DUkVBVEUgSU5ERVggaWR4X2Nob2ljZV9saXN0c19uYW1lIE9OIF9fU0NIRU1BX18uY2hvaWNlX2xpc3RzIFVTSU5HIGJ0cmVlIChuYW1lKTtcblxuQ1JFQVRFIElOREVYIGlkeF9jaG9pY2VfbGlzdHNfdXBkYXRlZF9hdCBPTiBfX1NDSEVNQV9fLmNob2ljZV9saXN0cyBVU0lORyBidHJlZSAodXBkYXRlZF9hdCk7XG5cbkNSRUFURSBVTklRVUUgSU5ERVggaWR4X2NsYXNzaWZpY2F0aW9uX3NldHNfcm93X3Jlc291cmNlX2lkIE9OIF9fU0NIRU1BX18uY2xhc3NpZmljYXRpb25fc2V0cyBVU0lORyBidHJlZSAocm93X3Jlc291cmNlX2lkKTtcblxuQ1JFQVRFIFVOSVFVRSBJTkRFWCBpZHhfY2xhc3NpZmljYXRpb25fc2V0c19yb3dfaWQgT04gX19TQ0hFTUFfXy5jbGFzc2lmaWNhdGlvbl9zZXRzIFVTSU5HIGJ0cmVlIChyb3dfaWQpO1xuXG5DUkVBVEUgSU5ERVggaWR4X2NsYXNzaWZpY2F0aW9uX3NldHNfbmFtZSBPTiBfX1NDSEVNQV9fLmNsYXNzaWZpY2F0aW9uX3NldHMgVVNJTkcgYnRyZWUgKG5hbWUpO1xuXG5DUkVBVEUgSU5ERVggaWR4X2NsYXNzaWZpY2F0aW9uX3NldHNfdXBkYXRlZF9hdCBPTiBfX1NDSEVNQV9fLmNsYXNzaWZpY2F0aW9uX3NldHMgVVNJTkcgYnRyZWUgKHVwZGF0ZWRfYXQpO1xuXG5DUkVBVEUgVU5JUVVFIElOREVYIGlkeF9mb3Jtc19yb3dfcmVzb3VyY2VfaWQgT04gX19TQ0hFTUFfXy5mb3JtcyBVU0lORyBidHJlZSAocm93X3Jlc291cmNlX2lkKTtcblxuQ1JFQVRFIFVOSVFVRSBJTkRFWCBpZHhfZm9ybXNfcm93X2lkIE9OIF9fU0NIRU1BX18uZm9ybXMgVVNJTkcgYnRyZWUgKHJvd19pZCk7XG5cbkNSRUFURSBJTkRFWCBpZHhfZm9ybXNfbmFtZSBPTiBfX1NDSEVNQV9fLmZvcm1zIFVTSU5HIGJ0cmVlIChuYW1lKTtcblxuQ1JFQVRFIElOREVYIGlkeF9mb3Jtc191cGRhdGVkX2F0IE9OIF9fU0NIRU1BX18uZm9ybXMgVVNJTkcgYnRyZWUgKHVwZGF0ZWRfYXQpO1xuXG5DUkVBVEUgVU5JUVVFIElOREVYIGlkeF9tZW1iZXJzaGlwc19yb3dfcmVzb3VyY2VfaWQgT04gX19TQ0hFTUFfXy5tZW1iZXJzaGlwcyBVU0lORyBidHJlZSAocm93X3Jlc291cmNlX2lkKTtcblxuQ1JFQVRFIFVOSVFVRSBJTkRFWCBpZHhfbWVtYmVyc2hpcHNfcm93X2lkIE9OIF9fU0NIRU1BX18ubWVtYmVyc2hpcHMgVVNJTkcgYnRyZWUgKHJvd19pZCk7XG5cbkNSRUFURSBJTkRFWCBpZHhfbWVtYmVyc2hpcHNfdXNlcl9yZXNvdXJjZV9pZCBPTiBfX1NDSEVNQV9fLm1lbWJlcnNoaXBzIFVTSU5HIGJ0cmVlICh1c2VyX3Jlc291cmNlX2lkKTtcblxuQ1JFQVRFIElOREVYIGlkeF9tZW1iZXJzaGlwc19yb2xlX3Jlc291cmNlX2lkIE9OIF9fU0NIRU1BX18ubWVtYmVyc2hpcHMgVVNJTkcgYnRyZWUgKHJvbGVfcmVzb3VyY2VfaWQpO1xuXG5DUkVBVEUgSU5ERVggaWR4X21lbWJlcnNoaXBzX25hbWUgT04gX19TQ0hFTUFfXy5tZW1iZXJzaGlwcyBVU0lORyBidHJlZSAobmFtZSk7XG5cbkNSRUFURSBJTkRFWCBpZHhfbWVtYmVyc2hpcHNfdXBkYXRlZF9hdCBPTiBfX1NDSEVNQV9fLm1lbWJlcnNoaXBzIFVTSU5HIGJ0cmVlICh1cGRhdGVkX2F0KTtcblxuQ1JFQVRFIFVOSVFVRSBJTkRFWCBpZHhfcGhvdG9zX3Jvd19yZXNvdXJjZV9pZCBPTiBfX1NDSEVNQV9fLnBob3RvcyBVU0lORyBidHJlZSAocm93X3Jlc291cmNlX2lkKTtcblxuQ1JFQVRFIFVOSVFVRSBJTkRFWCBpZHhfcGhvdG9zX3Jvd19pZCBPTiBfX1NDSEVNQV9fLnBob3RvcyBVU0lORyBidHJlZSAocm93X2lkKTtcblxuQ1JFQVRFIElOREVYIGlkeF9waG90b3NfYWNjZXNzX2tleSBPTiBfX1NDSEVNQV9fLnBob3RvcyBVU0lORyBidHJlZSAoYWNjZXNzX2tleSk7XG5cbkNSRUFURSBJTkRFWCBpZHhfcGhvdG9zX3JlY29yZF9yZXNvdXJjZV9pZCBPTiBfX1NDSEVNQV9fLnBob3RvcyBVU0lORyBidHJlZSAocmVjb3JkX3Jlc291cmNlX2lkKTtcblxuQ1JFQVRFIElOREVYIGlkeF9waG90b3NfZm9ybV9yZXNvdXJjZV9pZCBPTiBfX1NDSEVNQV9fLnBob3RvcyBVU0lORyBidHJlZSAoZm9ybV9yZXNvdXJjZV9pZCk7XG5cbkNSRUFURSBJTkRFWCBpZHhfcGhvdG9zX2NyZWF0ZWRfYnlfcmVzb3VyY2VfaWQgT04gX19TQ0hFTUFfXy5waG90b3MgVVNJTkcgYnRyZWUgKGNyZWF0ZWRfYnlfcmVzb3VyY2VfaWQpO1xuXG5DUkVBVEUgSU5ERVggaWR4X3Bob3Rvc19nZW9tZXRyeSBPTiBfX1NDSEVNQV9fLnBob3RvcyBVU0lORyBnaXN0IChnZW9tZXRyeSk7XG5cbkNSRUFURSBJTkRFWCBpZHhfcGhvdG9zX3VwZGF0ZWRfYXQgT04gX19TQ0hFTUFfXy5waG90b3MgVVNJTkcgYnRyZWUgKHVwZGF0ZWRfYXQpO1xuXG5DUkVBVEUgVU5JUVVFIElOREVYIGlkeF9wcm9qZWN0c19yb3dfcmVzb3VyY2VfaWQgT04gX19TQ0hFTUFfXy5wcm9qZWN0cyBVU0lORyBidHJlZSAocm93X3Jlc291cmNlX2lkKTtcblxuQ1JFQVRFIFVOSVFVRSBJTkRFWCBpZHhfcHJvamVjdHNfcm93X2lkIE9OIF9fU0NIRU1BX18ucHJvamVjdHMgVVNJTkcgYnRyZWUgKHJvd19pZCk7XG5cbkNSRUFURSBJTkRFWCBpZHhfcHJvamVjdHNfbmFtZSBPTiBfX1NDSEVNQV9fLnByb2plY3RzIFVTSU5HIGJ0cmVlIChuYW1lKTtcblxuQ1JFQVRFIElOREVYIGlkeF9wcm9qZWN0c191cGRhdGVkX2F0IE9OIF9fU0NIRU1BX18ucHJvamVjdHMgVVNJTkcgYnRyZWUgKHVwZGF0ZWRfYXQpO1xuXG5DUkVBVEUgVU5JUVVFIElOREVYIGlkeF9yb2xlc19yb3dfcmVzb3VyY2VfaWQgT04gX19TQ0hFTUFfXy5yb2xlcyBVU0lORyBidHJlZSAocm93X3Jlc291cmNlX2lkKTtcblxuQ1JFQVRFIFVOSVFVRSBJTkRFWCBpZHhfcm9sZXNfcm93X2lkIE9OIF9fU0NIRU1BX18ucm9sZXMgVVNJTkcgYnRyZWUgKHJvd19pZCk7XG5cbkNSRUFURSBJTkRFWCBpZHhfcm9sZXNfbmFtZSBPTiBfX1NDSEVNQV9fLnJvbGVzIFVTSU5HIGJ0cmVlIChuYW1lKTtcblxuQ1JFQVRFIElOREVYIGlkeF9yb2xlc191cGRhdGVkX2F0IE9OIF9fU0NIRU1BX18ucm9sZXMgVVNJTkcgYnRyZWUgKHVwZGF0ZWRfYXQpO1xuXG5DUkVBVEUgVU5JUVVFIElOREVYIGlkeF9zaWduYXR1cmVzX3Jvd19yZXNvdXJjZV9pZCBPTiBfX1NDSEVNQV9fLnNpZ25hdHVyZXMgVVNJTkcgYnRyZWUgKHJvd19yZXNvdXJjZV9pZCk7XG5cbkNSRUFURSBVTklRVUUgSU5ERVggaWR4X3NpZ25hdHVyZXNfcm93X2lkIE9OIF9fU0NIRU1BX18uc2lnbmF0dXJlcyBVU0lORyBidHJlZSAocm93X2lkKTtcblxuQ1JFQVRFIElOREVYIGlkeF9zaWduYXR1cmVzX2FjY2Vzc19rZXkgT04gX19TQ0hFTUFfXy5zaWduYXR1cmVzIFVTSU5HIGJ0cmVlIChhY2Nlc3Nfa2V5KTtcblxuQ1JFQVRFIElOREVYIGlkeF9zaWduYXR1cmVzX3JlY29yZF9yZXNvdXJjZV9pZCBPTiBfX1NDSEVNQV9fLnNpZ25hdHVyZXMgVVNJTkcgYnRyZWUgKHJlY29yZF9yZXNvdXJjZV9pZCk7XG5cbkNSRUFURSBJTkRFWCBpZHhfc2lnbmF0dXJlc19mb3JtX3Jlc291cmNlX2lkIE9OIF9fU0NIRU1BX18uc2lnbmF0dXJlcyBVU0lORyBidHJlZSAoZm9ybV9yZXNvdXJjZV9pZCk7XG5cbkNSRUFURSBJTkRFWCBpZHhfc2lnbmF0dXJlc19jcmVhdGVkX2J5X3Jlc291cmNlX2lkIE9OIF9fU0NIRU1BX18uc2lnbmF0dXJlcyBVU0lORyBidHJlZSAoY3JlYXRlZF9ieV9yZXNvdXJjZV9pZCk7XG5cbkNSRUFURSBJTkRFWCBpZHhfc2lnbmF0dXJlc191cGRhdGVkX2F0IE9OIF9fU0NIRU1BX18uc2lnbmF0dXJlcyBVU0lORyBidHJlZSAodXBkYXRlZF9hdCk7XG5cbkNSRUFURSBVTklRVUUgSU5ERVggaWR4X3ZpZGVvc19yb3dfcmVzb3VyY2VfaWQgT04gX19TQ0hFTUFfXy52aWRlb3MgVVNJTkcgYnRyZWUgKHJvd19yZXNvdXJjZV9pZCk7XG5cbkNSRUFURSBVTklRVUUgSU5ERVggaWR4X3ZpZGVvc19yb3dfaWQgT04gX19TQ0hFTUFfXy52aWRlb3MgVVNJTkcgYnRyZWUgKHJvd19pZCk7XG5cbkNSRUFURSBJTkRFWCBpZHhfdmlkZW9zX2FjY2Vzc19rZXkgT04gX19TQ0hFTUFfXy52aWRlb3MgVVNJTkcgYnRyZWUgKGFjY2Vzc19rZXkpO1xuXG5DUkVBVEUgSU5ERVggaWR4X3ZpZGVvc19yZWNvcmRfcmVzb3VyY2VfaWQgT04gX19TQ0hFTUFfXy52aWRlb3MgVVNJTkcgYnRyZWUgKHJlY29yZF9yZXNvdXJjZV9pZCk7XG5cbkNSRUFURSBJTkRFWCBpZHhfdmlkZW9zX2Zvcm1fcmVzb3VyY2VfaWQgT04gX19TQ0hFTUFfXy52aWRlb3MgVVNJTkcgYnRyZWUgKGZvcm1fcmVzb3VyY2VfaWQpO1xuXG5DUkVBVEUgSU5ERVggaWR4X3ZpZGVvc19jcmVhdGVkX2J5X3Jlc291cmNlX2lkIE9OIF9fU0NIRU1BX18udmlkZW9zIFVTSU5HIGJ0cmVlIChjcmVhdGVkX2J5X3Jlc291cmNlX2lkKTtcblxuQ1JFQVRFIElOREVYIGlkeF92aWRlb3NfZ2VvbWV0cnkgT04gX19TQ0hFTUFfXy52aWRlb3MgVVNJTkcgZ2lzdCAoZ2VvbWV0cnkpO1xuXG5DUkVBVEUgSU5ERVggaWR4X3ZpZGVvc191cGRhdGVkX2F0IE9OIF9fU0NIRU1BX18udmlkZW9zIFVTSU5HIGJ0cmVlICh1cGRhdGVkX2F0KTtcbmA7XG4iXX0=