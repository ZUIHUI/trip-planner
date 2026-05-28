export const TRIP_SETTING_IDS = Object.freeze({
  collaboration: 'collaboration'
});

const defaultCollaboration = {
  enabled: false,
  shareToken: '',
  permission: 'view',
  votesEnabled: true,
  createdAt: '',
  updatedAt: ''
};

const asObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);
const asArray = (value) => (Array.isArray(value) ? value : []);
const cleanString = (value, fallback = '') => (typeof value === 'string' ? value : fallback);

export const normalizeTripCollaborationSettings = (settings = {}) => {
  const source = asObject(settings);

  return {
    enabled: Boolean(source.enabled),
    shareToken: cleanString(source.shareToken || source.token),
    permission: source.permission === 'edit' ? 'edit' : 'view',
    votesEnabled: source.votesEnabled === undefined ? true : Boolean(source.votesEnabled),
    createdAt: cleanString(source.createdAt, defaultCollaboration.createdAt),
    updatedAt: cleanString(source.updatedAt, defaultCollaboration.updatedAt)
  };
};

export const normalizeTripSettingDocumentForApp = (document = {}) => {
  const source = asObject(document);
  const id = cleanString(source.id || source.setting);

  if (id === TRIP_SETTING_IDS.collaboration) {
    return {
      id,
      setting: TRIP_SETTING_IDS.collaboration,
      ...normalizeTripCollaborationSettings(source),
      updatedByUid: cleanString(source.updatedByUid),
      updatedByClientId: cleanString(source.updatedByClientId)
    };
  }

  return {
    ...source,
    id,
    setting: id
  };
};

export const applyTripSettingDocumentsToCollaboration = (collaboration = {}, settingDocuments = []) => {
  const documentsById = asArray(settingDocuments).reduce((acc, document) => {
    const normalizedDocument = normalizeTripSettingDocumentForApp(document);
    if (normalizedDocument.id) acc[normalizedDocument.id] = normalizedDocument;
    return acc;
  }, {});
  const collaborationDocument = documentsById[TRIP_SETTING_IDS.collaboration];

  return normalizeTripCollaborationSettings({
    ...collaboration,
    ...(collaborationDocument || {})
  });
};
