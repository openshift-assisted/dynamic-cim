// Persisted in language-preferences-modal.tsx of openshift-console
// TODO(mlibra): This is not very reliable, it should be exported by the SDK
export const getPreferredLang = () => localStorage.getItem('bridge/language') || undefined;
