export const LAST_OPENED_TRIP_KEY = 'trip_planner_last_opened_trip_id';
export const LEGACY_TRIP_STORAGE_KEY = 'trip_planner_data';
export const TRIP_STORAGE_KEY_PREFIX = 'trip_planner_data_';
export const CLIENT_ID_KEY = 'trip_planner_client_id';
export const PRESENCE_CLIENT_ID_KEY = 'trip_planner_presence_client_id';
export const THEME_STORAGE_KEY = 'trip_planner_theme';
export const INTERFACE_SIZE_STORAGE_KEY = 'trip_planner_interface_size';

export const getTripIndexKey = (uid) => `trip_planner_trip_index_${uid || 'guest'}`;
export const getTripStorageKey = (tripId, uid) => `${TRIP_STORAGE_KEY_PREFIX}${uid || 'guest'}_${tripId}`;
