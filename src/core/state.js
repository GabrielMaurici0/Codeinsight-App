const state = {
  files: [],
  fileContents: {},
  report: null,
  activeFilter: "all",
  activeSev: null,
  displayedIssues: [],
  allIssues: [],
};

export const getFiles = () => state.files;
export const getFileContents = () => state.fileContents;
export const getReport = () => state.report;
export const getActiveFilter = () => state.activeFilter;
export const getActiveSev = () => state.activeSev;
export const getDisplayedIssues = () => state.displayedIssues;
export const getAllIssues = () => state.allIssues;

export const setFiles = (files) => {
  state.files = files;
};
export const setFileContents = (contents) => {
  state.fileContents = contents;
};
export const setReport = (report) => {
  state.report = report;
};
export const setActiveFilter = (filter) => {
  state.activeFilter = filter;
};
export const setActiveSev = (sev) => {
  state.activeSev = sev;
};
export const setDisplayedIssues = (issues) => {
  state.displayedIssues = issues;
};
export const setAllIssues = (issues) => {
  state.allIssues = issues;
};

export const resetState = () => {
  state.files = [];
  state.fileContents = {};
  state.report = null;
  state.activeFilter = "all";
  state.activeSev = null;
  state.displayedIssues = [];
  state.allIssues = [];
};
