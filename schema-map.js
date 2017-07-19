import pgformat from 'pg-format';
import wkt from 'wellknown';
import { core } from 'fulcrum';

export default class SchemaMap {
  // * force 2d
  // * remove duplicate vertices
  static geomFromGeoJSON(geojsonGeometry) {
    return `ST_RemoveRepeatedPoints(ST_Force2D(ST_GeomFromText(${ pgformat('%L', wkt.stringify(geojsonGeometry)) }, 4326)))`;
  }

  // * force to multi
  // * force 2d
  // * remove duplicate vertices
  static multiGeomFromGeoJSON(geojsonGeometry) {
    return `ST_RemoveRepeatedPoints(ST_Force2D(ST_Multi(ST_GeomFromText(${ pgformat('%L', wkt.stringify(geojsonGeometry)) }, 4326))))`;
  }

  static geometry(latitude, longitude) {
    return { raw: this.geomFromGeoJSON({type: 'Point', coordinates: [ +longitude, +latitude ]}) };
  }

  static trackGeometry(trackJSON) {
    if (trackJSON) {
      const track = new core.Track('video', trackJSON);

      const geoJSON = track.toGeoJSONMultiLineString();

      if (geoJSON && geoJSON.geometry && geoJSON.geometry.coordinates.length && geoJSON.geometry.coordinates[0].length > 1) {
        return { raw: this.multiGeomFromGeoJSON(geoJSON) };
      }
    }

    return null;
  }

  static photo(row) {
    const hasLocation = row._latitude != null && row._longitude != null;

    return {
      row_id: row.rowID,
      row_resource_id: row.id,
      access_key: row.id,
      record_id: row._recordRowID,
      record_resource_id: row._recordID,
      form_id: row._formRowID,
      form_resource_id: row._formID,
      exif: row._exif ? JSON.stringify(row._exif) : null,
      file_size: row._fileSize,
      created_by_id: row._createdByRowID,
      created_by_resource_id: row._createdByID,
      updated_by_id: row._updatedByRowID,
      updated_by_resource_id: row._updatedByID,
      created_at: row._createdAt,
      updated_at: row._updatedAt,
      file: row._filePath,
      content_type: row._contentType,
      is_uploaded: row._isUploaded,
      is_stored: row._isStored,
      is_processed: row._isProcessed,
      geometry: hasLocation ? this.geometry(row._latitude, row._longitude) : null,
      latitude: hasLocation ? row._latitude : null,
      longitude: hasLocation ? row._longitude : null,
      altitude: row._altitude,
      direction: row._direction,
      accuracy: row._accuracy,
      width: row._width,
      height: row._height,
      make: row._make,
      model: row._model,
      software: row._software,
      date_time: row._dateTime
    };
  }

  static video(row) {
    return {
      row_id: row._rowID,
      row_resource_id: row.id,
      access_key: row.id,
      record_id: row._recordRowID,
      record_resource_id: row._recordID,
      form_id: row._formRowID,
      form_resource_id: row._formID,
      metadata: row._metadata,
      has_track: row._hasTrack,
      track: row._trackJSON,
      file_size: row._fileSize,
      created_by_id: row._createdByRowID,
      created_by_resource_id: row._createdByID,
      updated_by_id: row._updatedByRowID,
      updated_by_resource_id: row._updatedByID,
      created_at: row._createdAt,
      updated_at: row._updatedAt,
      file: row._filePath,
      content_type: row._contentType,
      is_uploaded: row._isUploaded,
      is_stored: row._isStored,
      is_processed: row._isProcessed,
      geometry: this.trackGeometry(row._trackJSON),
      width: row._width,
      height: row._height,
      duration: row._duration,
      bit_rate: row._bitRate
    };
  }

  static audio(row) {
    return {
      row_id: row._rowID,
      row_resource_id: row.id,
      access_key: row.id,
      record_id: row._recordRowID,
      record_resource_id: row._recordID,
      form_id: row._formRowID,
      form_resource_id: row._formID,
      metadata: row._metadata,
      has_track: row._hasTrack,
      track: row._trackJSON,
      file_size: row._fileSize,
      created_by_id: row._createdByRowID,
      created_by_resource_id: row._createdByID,
      updated_by_id: row._updatedByRowID,
      updated_by_resource_id: row._updatedByID,
      created_at: row._createdAt,
      updated_at: row._updatedAt,
      file: row._filePath,
      content_type: row._contentType,
      is_uploaded: row._isUploaded,
      is_stored: row._isStored,
      is_processed: row._isProcessed,
      geometry: this.trackGeometry(row._trackJSON),
      duration: row._duration,
      bit_rate: row._bitRate
    };
  }

  project(row) {
    return {
      row_id: row.rowID,
      row_resource_id: row.id,
      name: row._name,
      description: row._description,
      created_by_id: row._createdByRowID,
      created_by_resource_id: row._createdByID,
      created_at: row._createdAt,
      updated_at: row._updatedAt,
      deleted_at: row._deletedAt
    };
  }
}
