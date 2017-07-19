'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _pgFormat = require('pg-format');

var _pgFormat2 = _interopRequireDefault(_pgFormat);

var _wellknown = require('wellknown');

var _wellknown2 = _interopRequireDefault(_wellknown);

var _fulcrumDesktopPlugin = require('fulcrum-desktop-plugin');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class SchemaMap {
  // * force 2d
  // * remove duplicate vertices
  static geomFromGeoJSON(geojsonGeometry) {
    return `ST_RemoveRepeatedPoints(ST_Force2D(ST_GeomFromText(${(0, _pgFormat2.default)('%L', _wellknown2.default.stringify(geojsonGeometry))}, 4326)))`;
  }

  // * force to multi
  // * force 2d
  // * remove duplicate vertices
  static multiGeomFromGeoJSON(geojsonGeometry) {
    return `ST_RemoveRepeatedPoints(ST_Force2D(ST_Multi(ST_GeomFromText(${(0, _pgFormat2.default)('%L', _wellknown2.default.stringify(geojsonGeometry))}, 4326))))`;
  }

  static geometry(latitude, longitude) {
    return { raw: this.geomFromGeoJSON({ type: 'Point', coordinates: [+longitude, +latitude] }) };
  }

  static trackGeometry(trackJSON) {
    if (trackJSON) {
      const track = new _fulcrumDesktopPlugin.core.Track('video', trackJSON);

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
exports.default = SchemaMap;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NjaGVtYS1tYXAuanMiXSwibmFtZXMiOlsiU2NoZW1hTWFwIiwiZ2VvbUZyb21HZW9KU09OIiwiZ2VvanNvbkdlb21ldHJ5Iiwic3RyaW5naWZ5IiwibXVsdGlHZW9tRnJvbUdlb0pTT04iLCJnZW9tZXRyeSIsImxhdGl0dWRlIiwibG9uZ2l0dWRlIiwicmF3IiwidHlwZSIsImNvb3JkaW5hdGVzIiwidHJhY2tHZW9tZXRyeSIsInRyYWNrSlNPTiIsInRyYWNrIiwiVHJhY2siLCJnZW9KU09OIiwidG9HZW9KU09OTXVsdGlMaW5lU3RyaW5nIiwibGVuZ3RoIiwicGhvdG8iLCJyb3ciLCJoYXNMb2NhdGlvbiIsIl9sYXRpdHVkZSIsIl9sb25naXR1ZGUiLCJyb3dfaWQiLCJyb3dJRCIsInJvd19yZXNvdXJjZV9pZCIsImlkIiwiYWNjZXNzX2tleSIsInJlY29yZF9pZCIsIl9yZWNvcmRSb3dJRCIsInJlY29yZF9yZXNvdXJjZV9pZCIsIl9yZWNvcmRJRCIsImZvcm1faWQiLCJfZm9ybVJvd0lEIiwiZm9ybV9yZXNvdXJjZV9pZCIsIl9mb3JtSUQiLCJleGlmIiwiX2V4aWYiLCJKU09OIiwiZmlsZV9zaXplIiwiX2ZpbGVTaXplIiwiY3JlYXRlZF9ieV9pZCIsIl9jcmVhdGVkQnlSb3dJRCIsImNyZWF0ZWRfYnlfcmVzb3VyY2VfaWQiLCJfY3JlYXRlZEJ5SUQiLCJ1cGRhdGVkX2J5X2lkIiwiX3VwZGF0ZWRCeVJvd0lEIiwidXBkYXRlZF9ieV9yZXNvdXJjZV9pZCIsIl91cGRhdGVkQnlJRCIsImNyZWF0ZWRfYXQiLCJfY3JlYXRlZEF0IiwidXBkYXRlZF9hdCIsIl91cGRhdGVkQXQiLCJmaWxlIiwiX2ZpbGVQYXRoIiwiY29udGVudF90eXBlIiwiX2NvbnRlbnRUeXBlIiwiaXNfdXBsb2FkZWQiLCJfaXNVcGxvYWRlZCIsImlzX3N0b3JlZCIsIl9pc1N0b3JlZCIsImlzX3Byb2Nlc3NlZCIsIl9pc1Byb2Nlc3NlZCIsImFsdGl0dWRlIiwiX2FsdGl0dWRlIiwiZGlyZWN0aW9uIiwiX2RpcmVjdGlvbiIsImFjY3VyYWN5IiwiX2FjY3VyYWN5Iiwid2lkdGgiLCJfd2lkdGgiLCJoZWlnaHQiLCJfaGVpZ2h0IiwibWFrZSIsIl9tYWtlIiwibW9kZWwiLCJfbW9kZWwiLCJzb2Z0d2FyZSIsIl9zb2Z0d2FyZSIsImRhdGVfdGltZSIsIl9kYXRlVGltZSIsInZpZGVvIiwiX3Jvd0lEIiwibWV0YWRhdGEiLCJfbWV0YWRhdGEiLCJoYXNfdHJhY2siLCJfaGFzVHJhY2siLCJfdHJhY2tKU09OIiwiZHVyYXRpb24iLCJfZHVyYXRpb24iLCJiaXRfcmF0ZSIsIl9iaXRSYXRlIiwiYXVkaW8iLCJwcm9qZWN0IiwibmFtZSIsIl9uYW1lIiwiZGVzY3JpcHRpb24iLCJfZGVzY3JpcHRpb24iLCJkZWxldGVkX2F0IiwiX2RlbGV0ZWRBdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBRWUsTUFBTUEsU0FBTixDQUFnQjtBQUM3QjtBQUNBO0FBQ0EsU0FBT0MsZUFBUCxDQUF1QkMsZUFBdkIsRUFBd0M7QUFDdEMsV0FBUSxzREFBc0Qsd0JBQVMsSUFBVCxFQUFlLG9CQUFJQyxTQUFKLENBQWNELGVBQWQsQ0FBZixDQUFnRCxXQUE5RztBQUNEOztBQUVEO0FBQ0E7QUFDQTtBQUNBLFNBQU9FLG9CQUFQLENBQTRCRixlQUE1QixFQUE2QztBQUMzQyxXQUFRLCtEQUErRCx3QkFBUyxJQUFULEVBQWUsb0JBQUlDLFNBQUosQ0FBY0QsZUFBZCxDQUFmLENBQWdELFlBQXZIO0FBQ0Q7O0FBRUQsU0FBT0csUUFBUCxDQUFnQkMsUUFBaEIsRUFBMEJDLFNBQTFCLEVBQXFDO0FBQ25DLFdBQU8sRUFBRUMsS0FBSyxLQUFLUCxlQUFMLENBQXFCLEVBQUNRLE1BQU0sT0FBUCxFQUFnQkMsYUFBYSxDQUFFLENBQUNILFNBQUgsRUFBYyxDQUFDRCxRQUFmLENBQTdCLEVBQXJCLENBQVAsRUFBUDtBQUNEOztBQUVELFNBQU9LLGFBQVAsQ0FBcUJDLFNB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ZUFkZDtBQWVMQyw4QkFBd0I1QixJQUFJNkIsWUFmdkI7QUFnQkxDLGtCQUFZOUIsSUFBSStCLFVBaEJYO0FBaUJMQyxrQkFBWWhDLElBQUlpQyxVQWpCWDtBQWtCTEMsWUFBTWxDLElBQUltQyxTQWxCTDtBQW1CTEMsb0JBQWNwQyxJQUFJcUMsWUFuQmI7QUFvQkxDLG1CQUFhdEMsSUFBSXVDLFdBcEJaO0FBcUJMQyxpQkFBV3hDLElBQUl5QyxTQXJCVjtBQXNCTEMsb0JBQWMxQyxJQUFJMkMsWUF0QmI7QUF1Qkx6RCxnQkFBVSxLQUFLTSxhQUFMLENBQW1CUSxJQUFJb0UsVUFBdkIsQ0F2Qkw7QUF3QkxDLGdCQUFVckUsSUFBSXNFLFNBeEJUO0FBeUJMQyxnQkFBVXZFLElBQUl3RTtBQXpCVCxLQUFQO0FBMkJEOztBQUVERSxVQUFRMUUsR0FBUixFQUFhO0FBQ1gsV0FBTztBQUNMSSxjQUFRSixJQUFJSyxLQURQO0FBRUxDLHVCQUFpQk4sSUFBSU8sRUFGaEI7QUFHTG9FLFlBQU0zRSxJQUFJNEUsS0FITDtBQUlMQyxtQkFBYTdFLElBQUk4RSxZQUpaO0FBS0x4RCxxQkFBZXRCLElBQUl1QixlQUxkO0FBTUxDLDhCQUF3QnhCLElBQUl5QixZQU52QjtBQU9MSyxrQkFBWTlCLElBQUkrQixVQVBYO0FBUUxDLGtCQUFZaEMsSUFBSWlDLFVBUlg7QUFTTDhDLGtCQUFZL0UsSUFBSWdGO0FBVFgsS0FBUDtBQVdEO0FBako0QjtrQkFBVm5HLFMiLCJmaWxlIjoic2NoZW1hLW1hcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBwZ2Zvcm1hdCBmcm9tICdwZy1mb3JtYXQnO1xuaW1wb3J0IHdrdCBmcm9tICd3ZWxsa25vd24nO1xuaW1wb3J0IHsgY29yZSB9IGZyb20gJ2Z1bGNydW0nO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTY2hlbWFNYXAge1xuICAvLyAqIGZvcmNlIDJkXG4gIC8vICogcmVtb3ZlIGR1cGxpY2F0ZSB2ZXJ0aWNlc1xuICBzdGF0aWMgZ2VvbUZyb21HZW9KU09OKGdlb2pzb25HZW9tZXRyeSkge1xuICAgIHJldHVybiBgU1RfUmVtb3ZlUmVwZWF0ZWRQb2ludHMoU1RfRm9yY2UyRChTVF9HZW9tRnJvbVRleHQoJHsgcGdmb3JtYXQoJyVMJywgd2t0LnN0cmluZ2lmeShnZW9qc29uR2VvbWV0cnkpKSB9LCA0MzI2KSkpYDtcbiAgfVxuXG4gIC8vICogZm9yY2UgdG8gbXVsdGlcbiAgLy8gKiBmb3JjZSAyZFxuICAvLyAqIHJlbW92ZSBkdXBsaWNhdGUgdmVydGljZXNcbiAgc3RhdGljIG11bHRpR2VvbUZyb21HZW9KU09OKGdlb2pzb25HZW9tZXRyeSkge1xuICAgIHJldHVybiBgU1RfUmVtb3ZlUmVwZWF0ZWRQb2ludHMoU1RfRm9yY2UyRChTVF9NdWx0aShTVF9HZW9tRnJvbVRleHQoJHsgcGdmb3JtYXQoJyVMJywgd2t0LnN0cmluZ2lmeShnZW9qc29uR2VvbWV0cnkpKSB9LCA0MzI2KSkpKWA7XG4gIH1cblxuICBzdGF0aWMgZ2VvbWV0cnkobGF0aXR1ZGUsIGxvbmdpdHVkZSkge1xuICAgIHJldHVybiB7IHJhdzogdGhpcy5nZW9tRnJvbUdlb0pTT04oe3R5cGU6ICdQb2ludCcsIGNvb3JkaW5hdGVzOiBbICtsb25naXR1ZGUsICtsYXRpdHVkZSBdfSkgfTtcbiAgfVxuXG4gIHN0YXRpYyB0cmFja0dlb21ldHJ5KHRyYWNrSlNPTikge1xuICAgIGlmICh0cmFja0pTT04pIHtcbiAgICAgIGNvbnN0IHRyYWNrID0gbmV3IGNvcmUuVHJhY2soJ3ZpZGVvJywgdHJhY2tKU09OKTtcblxuICAgICAgY29uc3QgZ2VvSlNPTiA9IHRyYWNrLnRvR2VvSlNPTk11bHRpTGluZVN0cmluZygpO1xuXG4gICAgICBpZiAoZ2VvSlNPTiAmJiBnZW9KU09OLmdlb21ldHJ5ICYmIGdlb0pTT04uZ2VvbWV0cnkuY29vcmRpbmF0ZXMubGVuZ3RoICYmIGdlb0pTT04uZ2VvbWV0cnkuY29vcmRpbmF0ZXNbMF0ubGVuZ3RoID4gMSkge1xuICAgICAgICByZXR1cm4geyByYXc6IHRoaXMubXVsdGlHZW9tRnJvbUdlb0pTT04oZ2VvSlNPTikgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHN0YXRpYyBwaG90byhyb3cpIHtcbiAgICBjb25zdCBoYXNMb2NhdGlvbiA9IHJvdy5fbGF0aXR1ZGUgIT0gbnVsbCAmJiByb3cuX2xvbmdpdHVkZSAhPSBudWxsO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHJvd19pZDogcm93LnJvd0lELFxuICAgICAgcm93X3Jlc291cmNlX2lkOiByb3cuaWQsXG4gICAgICBhY2Nlc3Nfa2V5OiByb3cuaWQsXG4gICAgICByZWNvcmRfaWQ6IHJvdy5fcmVjb3JkUm93SUQsXG4gICAgICByZWNvcmRfcmVzb3VyY2VfaWQ6IHJvdy5fcmVjb3JkSUQsXG4gICAgICBmb3JtX2lkOiByb3cuX2Zvcm1Sb3dJRCxcbiAgICAgIGZvcm1fcmVzb3VyY2VfaWQ6IHJvdy5fZm9ybUlELFxuICAgICAgZXhpZjogcm93Ll9leGlmID8gSlNPTi5zdHJpbmdpZnkocm93Ll9leGlmKSA6IG51bGwsXG4gICAgICBmaWxlX3NpemU6IHJvdy5fZmlsZVNpemUsXG4gICAgICBjcmVhdGVkX2J5X2lkOiByb3cuX2NyZWF0ZWRCeVJvd0lELFxuICAgICAgY3JlYXRlZF9ieV9yZXNvdXJjZV9pZDogcm93Ll9jcmVhdGVkQnlJRCxcbiAgICAgIHVwZGF0ZWRfYnlfaWQ6IHJvdy5fdXBkYXRlZEJ5Um93SUQsXG4gICAgICB1cGRhdGVkX2J5X3Jlc291cmNlX2lkOiByb3cuX3VwZGF0ZWRCeUlELFxuICAgICAgY3JlYXRlZF9hdDogcm93Ll9jcmVhdGVkQXQsXG4gICAgICB1cGRhdGVkX2F0OiByb3cuX3VwZGF0ZWRBdCxcbiAgICAgIGZpbGU6IHJvdy5fZmlsZVBhdGgsXG4gICAgICBjb250ZW50X3R5cGU6IHJvdy5fY29udGVudFR5cGUsXG4gICAgICBpc191cGxvYWRlZDogcm93Ll9pc1VwbG9hZGVkLFxuICAgICAgaXNfc3RvcmVkOiByb3cuX2lzU3RvcmVkLFxuICAgICAgaXNfcHJvY2Vzc2VkOiByb3cuX2lzUHJvY2Vzc2VkLFxuICAgICAgZ2VvbWV0cnk6IGhhc0xvY2F0aW9uID8gdGhpcy5nZW9tZXRyeShyb3cuX2xhdGl0dWRlLCByb3cuX2xvbmdpdHVkZSkgOiBudWxsLFxuICAgICAgbGF0aXR1ZGU6IGhhc0xvY2F0aW9uID8gcm93Ll9sYXRpdHVkZSA6IG51bGwsXG4gICAgICBsb25naXR1ZGU6IGhhc0xvY2F0aW9uID8gcm93Ll9sb25naXR1ZGUgOiBudWxsLFxuICAgICAgYWx0aXR1ZGU6IHJvdy5fYWx0aXR1ZGUsXG4gICAgICBkaXJlY3Rpb246IHJvdy5fZGlyZWN0aW9uLFxuICAgICAgYWNjdXJhY3k6IHJvdy5fYWNjdXJhY3ksXG4gICAgICB3aWR0aDogcm93Ll93aWR0aCxcbiAgICAgIGhlaWdodDogcm93Ll9oZWlnaHQsXG4gICAgICBtYWtlOiByb3cuX21ha2UsXG4gICAgICBtb2RlbDogcm93Ll9tb2RlbCxcbiAgICAgIHNvZnR3YXJlOiByb3cuX3NvZnR3YXJlLFxuICAgICAgZGF0ZV90aW1lOiByb3cuX2RhdGVUaW1lXG4gICAgfTtcbiAgfVxuXG4gIHN0YXRpYyB2aWRlbyhyb3cpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcm93X2lkOiByb3cuX3Jvd0lELFxuICAgICAgcm93X3Jlc291cmNlX2lkOiByb3cuaWQsXG4gICAgICBhY2Nlc3Nfa2V5OiByb3cuaWQsXG4gICAgICByZWNvcmRfaWQ6IHJvdy5fcmVjb3JkUm93SUQsXG4gICAgICByZWNvcmRfcmVzb3VyY2VfaWQ6IHJvdy5fcmVjb3JkSUQsXG4gICAgICBmb3JtX2lkOiByb3cuX2Zvcm1Sb3dJRCxcbiAgICAgIGZvcm1fcmVzb3VyY2VfaWQ6IHJvdy5fZm9ybUlELFxuICAgICAgbWV0YWRhdGE6IHJvdy5fbWV0YWRhdGEsXG4gICAgICBoYXNfdHJhY2s6IHJvdy5faGFzVHJhY2ssXG4gICAgICB0cmFjazogcm93Ll90cmFja0pTT04sXG4gICAgICBmaWxlX3NpemU6IHJvdy5fZmlsZVNpemUsXG4gICAgICBjcmVhdGVkX2J5X2lkOiByb3cuX2NyZWF0ZWRCeVJvd0lELFxuICAgICAgY3JlYXRlZF9ieV9yZXNvdXJjZV9pZDogcm93Ll9jcmVhdGVkQnlJRCxcbiAgICAgIHVwZGF0ZWRfYnlfaWQ6IHJvdy5fdXBkYXRlZEJ5Um93SUQsXG4gICAgICB1cGRhdGVkX2J5X3Jlc291cmNlX2lkOiByb3cuX3VwZGF0ZWRCeUlELFxuICAgICAgY3JlYXRlZF9hdDogcm93Ll9jcmVhdGVkQXQsXG4gICAgICB1cGRhdGVkX2F0OiByb3cuX3VwZGF0ZWRBdCxcbiAgICAgIGZpbGU6IHJvdy5fZmlsZVBhdGgsXG4gICAgICBjb250ZW50X3R5cGU6IHJvdy5fY29udGVudFR5cGUsXG4gICAgICBpc191cGxvYWRlZDogcm93Ll9pc1VwbG9hZGVkLFxuICAgICAgaXNfc3RvcmVkOiByb3cuX2lzU3RvcmVkLFxuICAgICAgaXNfcHJvY2Vzc2VkOiByb3cuX2lzUHJvY2Vzc2VkLFxuICAgICAgZ2VvbWV0cnk6IHRoaXMudHJhY2tHZW9tZXRyeShyb3cuX3RyYWNrSlNPTiksXG4gICAgICB3aWR0aDogcm93Ll93aWR0aCxcbiAgICAgIGhlaWdodDogcm93Ll9oZWlnaHQsXG4gICAgICBkdXJhdGlvbjogcm93Ll9kdXJhdGlvbixcbiAgICAgIGJpdF9yYXRlOiByb3cuX2JpdFJhdGVcbiAgICB9O1xuICB9XG5cbiAgc3RhdGljIGF1ZGlvKHJvdykge1xuICAgIHJldHVybiB7XG4gICAgICByb3dfaWQ6IHJvdy5fcm93SUQsXG4gICAgICByb3dfcmVzb3VyY2VfaWQ6IHJvdy5pZCxcbiAgICAgIGFjY2Vzc19rZXk6IHJvdy5pZCxcbiAgICAgIHJlY29yZF9pZDogcm93Ll9yZWNvcmRSb3dJRCxcbiAgICAgIHJlY29yZF9yZXNvdXJjZV9pZDogcm93Ll9yZWNvcmRJRCxcbiAgICAgIGZvcm1faWQ6IHJvdy5fZm9ybVJvd0lELFxuICAgICAgZm9ybV9yZXNvdXJjZV9pZDogcm93Ll9mb3JtSUQsXG4gICAgICBtZXRhZGF0YTogcm93Ll9tZXRhZGF0YSxcbiAgICAgIGhhc190cmFjazogcm93Ll9oYXNUcmFjayxcbiAgICAgIHRyYWNrOiByb3cuX3RyYWNrSlNPTixcbiAgICAgIGZpbGVfc2l6ZTogcm93Ll9maWxlU2l6ZSxcbiAgICAgIGNyZWF0ZWRfYnlfaWQ6IHJvdy5fY3JlYXRlZEJ5Um93SUQsXG4gICAgICBjcmVhdGVkX2J5X3Jlc291cmNlX2lkOiByb3cuX2NyZWF0ZWRCeUlELFxuICAgICAgdXBkYXRlZF9ieV9pZDogcm93Ll91cGRhdGVkQnlSb3dJRCxcbiAgICAgIHVwZGF0ZWRfYnlfcmVzb3VyY2VfaWQ6IHJvdy5fdXBkYXRlZEJ5SUQsXG4gICAgICBjcmVhdGVkX2F0OiByb3cuX2NyZWF0ZWRBdCxcbiAgICAgIHVwZGF0ZWRfYXQ6IHJvdy5fdXBkYXRlZEF0LFxuICAgICAgZmlsZTogcm93Ll9maWxlUGF0aCxcbiAgICAgIGNvbnRlbnRfdHlwZTogcm93Ll9jb250ZW50VHlwZSxcbiAgICAgIGlzX3VwbG9hZGVkOiByb3cuX2lzVXBsb2FkZWQsXG4gICAgICBpc19zdG9yZWQ6IHJvdy5faXNTdG9yZWQsXG4gICAgICBpc19wcm9jZXNzZWQ6IHJvdy5faXNQcm9jZXNzZWQsXG4gICAgICBnZW9tZXRyeTogdGhpcy50cmFja0dlb21ldHJ5KHJvdy5fdHJhY2tKU09OKSxcbiAgICAgIGR1cmF0aW9uOiByb3cuX2R1cmF0aW9uLFxuICAgICAgYml0X3JhdGU6IHJvdy5fYml0UmF0ZVxuICAgIH07XG4gIH1cblxuICBwcm9qZWN0KHJvdykge1xuICAgIHJldHVybiB7XG4gICAgICByb3dfaWQ6IHJvdy5yb3dJRCxcbiAgICAgIHJvd19yZXNvdXJjZV9pZDogcm93LmlkLFxuICAgICAgbmFtZTogcm93Ll9uYW1lLFxuICAgICAgZGVzY3JpcHRpb246IHJvdy5fZGVzY3JpcHRpb24sXG4gICAgICBjcmVhdGVkX2J5X2lkOiByb3cuX2NyZWF0ZWRCeVJvd0lELFxuICAgICAgY3JlYXRlZF9ieV9yZXNvdXJjZV9pZDogcm93Ll9jcmVhdGVkQnlJRCxcbiAgICAgIGNyZWF0ZWRfYXQ6IHJvdy5fY3JlYXRlZEF0LFxuICAgICAgdXBkYXRlZF9hdDogcm93Ll91cGRhdGVkQXQsXG4gICAgICBkZWxldGVkX2F0OiByb3cuX2RlbGV0ZWRBdFxuICAgIH07XG4gIH1cbn1cbiJdfQ==