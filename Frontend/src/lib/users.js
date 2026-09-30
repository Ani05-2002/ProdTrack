export const USERS = {
  "priya.indexer": {
    username: "priya.indexer",
    password: "demo123",

    name: "Priya Sharma",
    role: "Indexer",
    roleKey: "indexer",
    emp: "EMP-1042",
    dept: "Indexing Ops",
    lead: "Rohan Mehta",
    projects: ["ABC Medical Imaging", "Ortho Kids", "Spine Indexing"],

    dashboardPath: "/indexer/dashboard",
  },

  "rohan.lead": {
    username: "rohan.lead",
    password: "demo123",

    name: "Rohan Mehta",
    role: "Team Lead",
    roleKey: "teamLead",
    emp: "EMP-0771",
    dept: "Indexing Ops",
    lead: "Meera Nair",
    projects: ["ABC Medical Imaging", "Ortho Kids", "Spine Indexing", "Cardio Records"],

    dashboardPath: "/team-lead/dashboard",
  },

  "meera.core": {
    username: "meera.core",
    password: "demo123",

    name: "Meera Iyer",
    role: "Core Team",
    roleKey: "coreTeam",
    emp: "EMP-0310",
    dept: "Production Core",
    lead: "—",
    projects: ["All projects"],

    dashboardPath: "/core-team/dashboard",
  },

  admin: {
    username: "admin",
    password: "demo123",

    name: "Admin User",
    role: "Administrator",
    roleKey: "administrator",
    emp: "EMP-0001",
    dept: "IT / Admin",
    lead: "—",
    projects: ["All projects"],

    dashboardPath: "/administrator/dashboard",
  },
};


// Used by SignIn.jsx to show the demo accounts
export const DEMO_ACCOUNTS = Object.values(USERS);


// Login helper
export const authenticateUser = (username, password) => {
  const cleanUsername = username.trim();

  const user = USERS[cleanUsername];

  if (!user) {
    return null;
  }

  if (user.password !== password) {
    return null;
  }

  return user;
};
