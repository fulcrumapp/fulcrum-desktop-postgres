module.exports = {
  shouldUpdateRecord: ({record, account}) => {
    // don't update a record that has a certain criteria
    if (record.form.name === 'Building Inspection') {
      const floors = record.formValues.find('number_of_floors');

      if (record.status === 'incomplete' && floors && floors.numericValue < 2) {
        return false;
      }
    }

    return true;
  },

  shouldUpdateForm: ({form, account}) => {
    // don't sync a form with this name
    if (form.name === 'GeoFood') {
      return false;
    }

    return true;
  }
}
