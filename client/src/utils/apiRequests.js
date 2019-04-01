import axios from "axios";

let baseURL;

console.log("ENCOMPASS: ,", process.env.REACT_APP_ENCOMPASS);
if (process.env.REACT_APP_ENCOMPASS) {
  if (process.env.NODE_ENV === "production") {
    baseURL = process.env.REACT_APP_ENCOMPASS_URL_PRODUCTION;
  } else if (process.env.NODE_ENV === "staging") {
    baseURL = process.env.REACT_APP_ENCOMPASS_URL_STAGING;
  } else if (process.env.NODE_ENV === "dev" || process.env.NODE_ENV) {
    baseURL = process.env.REACT_APP_ENCOMPASS_URL_DEV;
  }
} else {
  if (process.env.NODE_ENV === "production") {
    baseURL = process.env.REACT_APP_SERVER_URL_PRODUCTION;
  } else if (process.env.NODE_ENV === "staging") {
    baseURL = process.env.REACT_APP_SERVER_URL_STAGING;
  } else if (process.env.NODE_ENV === "dev") {
    baseURL = process.env.REACT_APP_SERVER_URL_DEV;
  }
}

const api = axios.create({ baseURL });

console.log("base url: ", baseURL);

export default {
  get: (resource, params) => {
    return api.get(`/api/${resource}`, params ? { params } : {});
  },

  search: (resource, text, exclude) => {
    return api.get(`/api/search/${resource}`, { params: { text, exclude } });
  },

  searchPaginated: (resource, criteria, skip, filters) => {
    let { privacySetting, roomType } = filters;
    let params = criteria ? { criteria, skip } : { skip };
    if (privacySetting !== null) params.privacySetting = privacySetting;
    if (roomType !== null) params.roomType = roomType;
    return api.get(`/api/searchPaginated/${resource}`, { params });
  },

  post: (resource, body) => {
    return api.post(`/api/${resource}`, body);
  },

  put: (resource, id, body) => {
    return api.put(`/api/${resource}/${id}`, body);
  },

  getById: (resource, id, temp, events, encompass) => {
    if (temp) {
      return api.get(`/api/${resource}/${id}/tempRoom`);
    } else if (events) {
      return api.get(`/api/${resource}/${id}`, { params: { events } });
    }
    return api.get(`/api/${resource}/${id}`);
  },

  remove: (resource, id) => {
    return api.delete(`/api/${resource}/${id}`);
  },

  enterWithCode: (resource, resourceId, userId, entryCode) => {
    return api.put(`/api/${resource}/${resourceId}`, {
      checkAccess: { userId, entryCode }
    });
  },

  requestAccess: (owners, userId, resource, resourceId) => {
    let resourceType;
    if (resource === "courses" || resource === "course") {
      resourceType = "course";
    }
    if (resource === "rooms" || resource === "room") {
      resourceType = "room";
    }
    // @TODO consider making notificationTypes a directory of constants like action types in redux
    let promises = owners.map(owner => {
      // return axios.put(`/api/user/${owner}`, {notificationType: 'requestAccess', user: userId, resource, _id: resourceId})
      return api.post("api/notifications", {
        notificationType: "requestAccess",
        toUser: owner,
        fromUser: userId,
        resourceType: resourceType,
        resourceId: resourceId
      });
    });
    return Promise.all(promises);
  },

  removeNotification: ntfId => {
    return api.put(`/api/notifications/${ntfId}`, {
      isTrashed: true
    });
  },

  removeMember: (resource, resourceId, user) => {
    return api.put(`/api/${resource}/${resourceId}/remove`, {
      members: { user }
    });
  },

  addUserResource: (resource, resourceId, userId) => {
    return api.put(`/api/user/${userId}/add`, { [resource]: resourceId });
  },

  inviteUser: () => {},

  grantAccess: (user, resource, resourceId, ntfType) => {
    return api.put(`/api/${resource}s/${resourceId}/add`, {
      members: { user, role: "participant" },
      ntfType
    });
  },

  updateMembers: (resource, resourceId, updatedMembers) => {
    return api.put(`/api/${resource}/${resourceId}`, {
      members: updatedMembers
    });
  },
  getDesmos: url => {
    return api.get(`/desmos?url=${url}`);
  },
  uploadGgbFiles: formData => {
    return api.post(`/api/upload/ggb`, formData);
  }
};
