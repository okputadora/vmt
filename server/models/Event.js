const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;
const Tab = require('./Tab.js');

const Event = new mongoose.Schema({
  user: { type: ObjectId, ref: 'User' },
  event: { type: String }, // ggb xml
  eventArray: [{ type: String }], // array of ffb events
  definition: { type: String }, // specific to ggb
  label: { type: String }, // specific to ggb
  action: { type: String }, // additional information about the action
  description: { type: String }, // e,g, "Michael added point A"
  currentState: { type: String }, // DESMOS ONLY...@todo some validation for this
  room: { type: ObjectId, ref: 'Room', required: true },
  tab: { type: ObjectId, ref: 'Tab', required: true },
  eventType: {
    type: String,
    enum: [
      'ADD',
      'REMOVE',
      'UPDATE',
      'UPDATE_STYLE',
      'CHANGE_PERSPECTIVE',
      'NEW_TAB',
      'BATCH_UPDATE',
      'BATCH_ADD',
      'SELECT',
      'UNDO',
      'REDO',
    ],
  },
  color: { type: String },
  isMultiPart: { type: Boolean, default: false },
  timestamp: { type: Number, required: true }, // UNIX TIME but in MS
  isTrashed: { type: Boolean, default: false },
});

Event.pre('save', async function() {
  // tabs[this.tabIndex].events.push(this._id)
  try {
    await Tab.findByIdAndUpdate(this.tab, { $addToSet: { events: this._id } });
  } catch (err) {
    console.error(err);
  }
});

module.exports = mongoose.model('Event', Event);
