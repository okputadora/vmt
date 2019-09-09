const _ = require('lodash');
const db = require('../models');

const { Tab } = db;
const { Room } = db;

const colorMap = require('../constants/colorMap.js');

module.exports = {
  get: (params) => {
    if (params && params.constructor === Array) {
      params = { _id: { $in: params } };
    } else {
      params = params || {};
      params.tempRoom = false; // we don't want any temporary rooms
    }
    return new Promise((resolve, reject) => {
      db.Room.find(params)
        .sort('-createdAt')
        .populate({ path: 'members.user', select: 'username' })
        .populate({ path: 'currentMembers', select: 'username' })
        .populate({ path: 'tabs', select: 'name tabType' })
        .then((rooms) => {
          // rooms = rooms.map(room => room.tempRoom ? room : room.summary())
          resolve(rooms);
        })
        .catch((err) => reject(err));
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.Room.findById(id)
        .populate({ path: 'creator', select: 'username' })
        // .populate({
        //   path: 'chat',
        //   populate: { path: 'user', select: 'username' },
        //   select: '-room',
        // })
        .populate({ path: 'members.user', select: 'username' })
        // .populate({ path: 'currentMembers.user', select: 'username' })
        .populate({ path: 'course', select: 'name' })
        // .populate({
        //   path: 'tabs',
        //   populate: { path: params.events ? 'events' : '' },
        // })
        .populate({ path: 'graphImage', select: 'imageData' })
        .select('name creator members course graphImage privacySetting _id')
        .then((room) => {
          resolve(room);
        })
        .catch((err) => reject(err));
    });
  },

  getPopulatedById: (id, params) => {
    return db.Room.findById(id)
      .populate({ path: 'creator', select: 'username' })
      .populate({
        path: 'chat',
        // options: { limit: 25 }, // Eventually we'll need to paginate this
        populate: { path: 'user', select: 'username' },
        select: '-room',
      })
      .populate({ path: 'members.user', select: 'username' })
      .populate({ path: 'currentMembers', select: 'username' })
      .populate({ path: 'course', select: 'name' })
      .populate({
        path: 'tabs',
        populate: {
          path: params.events ? 'events' : '',
          populate: params.events
            ? { path: 'user', select: 'username color' }
            : '',
          // options: { limit: 25 },
        },
      });
  },

  // returns the current state for each tab...does not return events or any other information
  getCurrentState: (id) => {
    return new Promise((resolve, reject) => {
      db.Room.findById(id)
        .select('tabs')
        .populate({ path: 'tabs', select: 'currentState' })
        .lean()
        .then((room) => {
          resolve(room);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },

  searchPaginated: async (criteria, skip, filters) => {
    let aggregationPipeline = [
      { $match: { tempRoom: false, isTrashed: false } },
      {
        $project: {
          _id: 1,
          name: 1,
          instructions: 1,
          description: 1,
          image: 1,
          tabs: 1,
          members: {
            $filter: {
              input: '$members',
              as: 'member',
              cond: {
                $eq: ['$$member.role', 'facilitator'],
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'members.user',
          foreignField: '_id',
          as: 'facilitatorObject',
        },
      },

      { $unwind: '$facilitatorObject' },
      {
        $match: {
          $or: [
            { name: criteria },
            { description: criteria },
            { instructions: criteria },
            { 'facilitatorObject.username': criteria },
          ],
        },
      },
    ];
    if (filters.privacySetting) {
      aggregationPipeline.unshift({
        $match: { privacySetting: filters.privacySetting },
      });
    }

    if (filters.roomType) {
      console.log('fitlering by room type: ', filters.roomType);
      aggregationPipeline = aggregationPipeline.concat([
        { $unwind: '$tabs' },
        {
          $lookup: {
            from: 'tabs',
            localField: 'tabs',
            foreignField: '_id',
            as: 'tabObjects',
          },
        },
        { $unwind: '$tabObjects' },
        // {
        //   $group: {
        //     _id: '$_id',
        //     name: { $set: '$name' },
        //     tabs: { $push: '$tabs' },
        //     tabObjects: { $push: '$tabObjects' },
        //   },
        // },
        {
          $match: { 'tabObjects.tabType': filters.roomType },
          // $project: {
          //   _id: 1,
          //   name: 1,
          //   instructions: 1,
          //   description: 1,
          //   image: 1,
          //   tabs: 1,
          //   members: 1,
          //   tabObjects: 1,
          //   isGeogebra: {
          //     $filter: {
          //       input: '$tabObject',
          //       as: 'tab',
          //       cond: {
          //         $eq: ['$$tab.tabType', 'geogebra'],
          //       },
          //     },
          //   },
          //   isDesmos: {
          //     $filter: {
          //       input: '$tabs',
          //       as: 'tab',
          //       cond: {
          //         $eq: ['$$tab.tabType', 'desmos'],
          //       },
          //     },
          //   },
          // },
        },
      ]);
    }
    console.log({ aggregationPipeline });
    const rooms = await Room.aggregate(aggregationPipeline);
    console.log(rooms[0]);
    return rooms;
    // return db.Room.find(params)
    //   .skip(parseInt(skip, 10))
    //   .limit(20)
    //   .sort('-createdAt')
    //   .populate({ path: 'members.user', select: 'username' })
    //   .populate({ path: 'tabs', select: 'tabType' })
    //   .select('name members description tabs privacySetting image')
    //   .then((rooms) => {
    //     if (filters.roomType) {
    //       return rooms.filter((room) => {
    //         return (
    //           room.tabs.filter((tab) => {
    //             return tab.tabType === filters.roomType;
    //           }).length > 0
    //         );
    //       });
    //     }
    //     return rooms;
    //   })
    //   .catch((err) => {
    //     Promise.reject(err);
    //   });
  },

  /**
   * @method post - creates a room (and tabs if necessary)
   * @param  {body} - fields for creating new room and tabs
   */
  post: (body) => {
    return new Promise(async (resolve, reject) => {
      // Prepare the tabs if they exist
      let existingTabs;
      if (body.tabs) {
        existingTabs = Object.assign([], body.tabs);
      } else if (body.activities) {
        try {
          const activities = await db.Activity.find({
            _id: { $in: body.activities },
          }).populate('tabs');
          existingTabs = activities.reduce(
            (acc, activity) => acc.concat(activity.tabs),
            []
          );
        } catch (err) {
          reject(err);
        }
      }
      let tabModels;
      delete body.tabs;
      // delete body.roomType;
      let ggbFiles;

      if (Array.isArray(body.ggbFiles)) {
        ggbFiles = [...body.ggbFiles];
        delete body.ggbFiles;
      }
      const room = new Room(body);
      if (existingTabs) {
        tabModels = existingTabs.map((tab) => {
          const newTab = new Tab({
            name: tab.name,
            room: room._id,
            ggbFile: tab.ggbFile,
            desmosLink: body.desmosLink,
            currentState: tab.currentState,
            startingPoint: tab.startingPoint,
            tabType: tab.tabType,
            appName: tab.appName,
          });
          return newTab;
        });
      } else if (Array.isArray(ggbFiles) && ggbFiles.length > 0) {
        tabModels = ggbFiles.map((file, index) => {
          return new Tab({
            name: `Tab ${index + 1}`,
            room: room._id,
            ggbFile: file,
            tabType: body.roomType,
            appName: body.appName,
          });
        });
      } else {
        tabModels = [
          new Tab({
            name: 'Tab 1',
            room: room._id,
            startinpoint: ' ',
            desmosLink: body.desmosLink,
            tabType: body.roomType || 'geogebra',
            appName: body.appName,
          }),
        ];
      }
      room.tabs = tabModels.map((tab) => tab._id);
      try {
        await tabModels.forEach((tab) => tab.save()); // These could run in parallel I suppose but then we'd have to edit one if ther ewas a failuer with the other
        await room.save();
        room.populate(
          { path: 'members.user tabs', select: 'username tabType name events' },
          (err, populatedRoom) => {
            if (err) reject(err);
            resolve(populatedRoom);
          }
        );
      } catch (err) {
        reject(err);
      }
    });
  },

  // Used for when a facilitator adds a new member. This is poorly organized and documents
  // but the put method is for when a user grants themself access or requests access.
  add: (id, body) => {
    return new Promise((resolve, reject) => {
      let room;
      let newMembers;
      const { ntfType, members } = body;
      const { user, role } = members;
      delete body.ntfType;
      db.Room.findById(id)
        // .populate({ path: "members.user", select: "username" })
        .then((res) => {
          room = res;
          const color = colorMap[room.members.length];
          room.members.push({ user, role, color });
          return room.save();
        })
        .then((savedRoom) => {
          return savedRoom.populate(
            {
              path: 'members.user',
              select: 'username',
            },
            () => {} // !! This is strange, but if we don't provide a callback here the population does not work
          );
        })
        .then((populatedRoom) => {
          newMembers = populatedRoom.members;
          return db.User.findByIdAndUpdate(user, {
            $addToSet: {
              rooms: id,
            },
          });
        })
        .then(() => {
          return db.Notification.create({
            resourceType: 'room',
            resourceId: id,
            toUser: body.members.user,
            notificationType: ntfType,
            parentResource: room.course,
          });
        })
        .then(() => resolve(newMembers))
        .catch((err) => reject(err));
    });
  },

  remove: (id, body) => {
    return new Promise((resolve, reject) => {
      db.User.findByIdAndUpdate(body.members.user, { $pull: { rooms: id } }); // @todo there is no error handling for this
      db.Room.findByIdAndUpdate(id, { $pull: body }, { new: true })
        .populate({ path: 'members.user', select: 'username' })
        .then((res) => {
          resolve(res.members);
        })
        .catch((err) => reject(err));
    });
  },

  // THIS IS A MESS @TODO CLEAN UP
  put: (id, body) => {
    return new Promise((resolve, reject) => {
      if (body.graphImage) {
        db.Room.findById(id)
          .then((room) => {
            db.Image.findByIdAndUpdate(room.graphImage, {
              imageData: body.graphImage.imageData,
            }).then(() => {
              return resolve();
            });
          })
          .catch((err) => {
            console.log(err);
            reject(err);
          });
      } else if (body.checkAccess) {
        let roomToPopulate;
        let fromUser;
        db.Room.findById(id)
          .then(async (room) => {
            const { entryCode, userId } = body.checkAccess;
            fromUser = userId;
            // @todo we should encrypt this
            if (
              room.entryCode !== entryCode &&
              room.privacySetting === 'private'
            ) {
              throw 'Incorrect Entry Code';
            }
            // correctCode, update room with user
            if (
              _.find(
                room.members,
                (member) => member.user.toString() === userId
              )
            ) {
              throw 'You have already been granted access to this room!';
            }
            // Add this member to the room
            room.members.push({
              user: userId,
              role: 'participant',
              color: colorMap[room.members.length],
            });
            try {
              await db.User.findByIdAndUpdate(fromUser, {
                $addToSet: {
                  rooms: id,
                },
              });
            } catch (err) {
              throw err;
            }
            return room.save();
          })
          .then((updatedRoom) => {
            // create notifications
            roomToPopulate = updatedRoom;
            const facilitators = updatedRoom.members.filter((m) => {
              return m.role === 'facilitator';
            });
            return Promise.all(
              facilitators.map((f) => {
                return db.Notification.create({
                  resourceType: 'room',
                  resourceId: roomToPopulate._id,
                  notificationType: 'newMember',
                  toUser: f.user,
                  fromUser,
                  parentResource: roomToPopulate.course,
                });
              })
            );
          })
          .then(() => {
            roomToPopulate.populate(
              { path: 'members.user', select: 'username' },
              function() {
                resolve(roomToPopulate);
              }
            );
          })
          .catch((err) => {
            reject(err);
          });
      } else if (Object.keys(body)[0] === 'tempRoom') {
        db.Room.findById(id).then(async (room) => {
          room.tempRoom = body.tempRoom;
          try {
            await room.save();
            resolve();
          } catch (err) {
            console.log(err);
            reject(err);
          }
        });
      } else if (body.isTrashed) {
        let updatedRoom;
        db.Room.findById(id)
          .then(async (room) => {
            room.isTrashed = true;
            try {
              updatedRoom = await room.save();
            } catch (err) {
              reject(err);
            }
            const userIds = room.members.map((member) => member.user);
            // Delete any notifications associated with this room
            return db.Notification.find({ resourceId: id }).then((ntfs) => {
              const ntfIds = ntfs.map((ntf) => ntf._id);
              const promises = [
                db.User.update(
                  { _id: { $in: userIds } },
                  {
                    $pull: {
                      rooms: id,
                      notifications: { $in: ntfIds },
                    },
                  },
                  { multi: true }
                ),
              ];
              promises.push(
                db.Notification.deleteMany({ _id: { $in: ntfIds } })
              );
              // delete this room from any courses
              if (room.course) {
                promises.push(
                  db.Course.findByIdAndUpdate(room.course, {
                    $pull: { rooms: id },
                  })
                );
              }
              return Promise.all(promises);
            });
          })
          .then(() => {
            resolve(updatedRoom);
          })
          .catch((err) => {
            reject(err);
          });
      } else {
        db.Room.findByIdAndUpdate(id, body, { new: true })
          .populate('currentMembers.user members.user', 'username')
          .populate('chat') // this seems random
          .then((res) => resolve(res))
          .catch((err) => {
            reject(err);
          })
          .catch((err) => reject(err));
      }
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.Room.findById(id)
        .then((room) => {
          room.remove();
          resolve(room);
        })
        .catch((err) => reject(err));
    });
  },

  // SOCKET METHODS
  addCurrentUsers: (roomId, newCurrentUserId, members) => {
    return new Promise(async (resolve, reject) => {
      // IF THIS IS A TEMP ROOM MEMBERS WILL HAVE A VALYE
      const query = members
        ? { $addToSet: { currentMembers: newCurrentUserId, members } }
        : { $addToSet: { currentMembers: newCurrentUserId } };
      db.Room.findByIdAndUpdate(roomId, query, { new: true })
        // .populate({ path: 'members.user', select: 'username' })
        .select('currentMembers members')
        .then((room) => {
          room.populate(
            { path: 'currentMembers members.user', select: 'username' },
            (err, poppedRoom) => {
              if (err) {
                reject(err);
              }
              resolve(poppedRoom);
            }
          );
        })
        .catch((err) => reject(err));
    });
  },

  removeCurrentUsers: (roomId, userId) => {
    return new Promise((resolve, reject) => {
      db.Room.findByIdAndUpdate(roomId, { $pull: { currentMembers: userId } }) // dont return new! we need the original list to filter back in sockets.js
        .populate({ path: 'currentMembers', select: 'username' })
        .select('currentMembers controlledBy')
        .then((room) => {
          resolve(room);
        })
        .catch((err) => reject(err));
    });
  },
};
