//Garren Burke - [2510158] & Xavier Hawes - [2504358] @ Thursday 1-3pm


"use strict";

const SCHOOL_NAME = "Ardenne High School";
const SCHOOL_MOTTO = "Deo Duce Quaere Optima";
const SCHOOL_MOTTO_EN = "With God as Guide, Seek the Best";
const SCHOOL_ADDRESS = "10 Ardenne Road, Kingston, Jamaica";
const SCHOOL_FOUNDED = 1927;
const COPYRIGHT_YEAR = 2026;

const STORAGE_PREFIX = "ardenne_";
const DEFAULT_TUITION = 45000;
const SUBJECTS = [
  "Mathematics",
  "English Language",
  "Integrated Science",
  "Social Studies",
  "Information Technology",
];
const GRADE_LEVELS = [7, 8, 9, 10, 11];
const SEMESTERS = ["2026 Semester 1", "2026 Semester 2"];
const NAME_CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz '.-";

/* Demo accounts live in the code, not in localStorage:
   the notes say never to store passwords in localStorage. */
const ACCOUNTS = [
  { username: "admin", password: "admin123", role: "admin", name: "System Administrator", teacherId: "" },
  { username: "teacher", password: "teach123", role: "teacher", name: "Mrs. Patricia Gordon", teacherId: "t1" },
  { username: "viewer", password: "view123", role: "viewer", name: "Authorised Viewer", teacherId: "" },
];

/* ---------- Short DOM helpers ---------- */
const byId = (id) => document.getElementById(id);
const all = (selector) => document.querySelectorAll(selector);

/* Attach one listener to every element that matches a selector */
function onAll(selector, eventName, handler) {
  all(selector).forEach((element) => {
    element.addEventListener(eventName, handler);
  });
}

/* ---------- Storage: localStorage (data) and sessionStorage (login) ---------- */
function loadData(key, fallback) {
  try {
    const text = localStorage.getItem(STORAGE_PREFIX + key);
    if (text === null) return fallback;
    return JSON.parse(text);
  } catch (error) {
    console.error("Could not read " + key, error);
    return fallback;
  }
}

function saveData(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (error) {
    alert("Browser storage is unavailable, so this change was not saved.");
  }
}

function getSession() {
  try {
    const text = sessionStorage.getItem(STORAGE_PREFIX + "session");
    return text === null ? null : JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function saveSession(account) {
  const session = {
    username: account.username,
    role: account.role,
    name: account.name,
    teacherId: account.teacherId,
  };
  sessionStorage.setItem(STORAGE_PREFIX + "session", JSON.stringify(session));
}

function clearSession() {
  sessionStorage.removeItem(STORAGE_PREFIX + "session");
}

/* ---------- Safe text for innerHTML (the notes warn about XSS) ---------- */
function escapeHtml(value) {
  let text = String(value === undefined || value === null ? "" : value);
  text = text.split("&").join("&amp;");
  text = text.split("<").join("&lt;");
  text = text.split(">").join("&gt;");
  text = text.split('"').join("&quot;");
  text = text.split("'").join("&#39;");
  return text;
}

/* ---------- Number helpers ---------- */
function roundOne(number) {
  return Math.round(number * 10) / 10;
}

function formatMoney(amount) {
  const digits = String(Math.round(amount));
  let result = "";
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) result += ",";
    result += digits[i];
  }
  return "J$" + result;
}

/* ---------- Validation: throw an Error, the caller catches and shows it ---------- */
function requireLength(value, label, minimum, maximum) {
  const text = value.trim();
  if (text.length < minimum) {
    throw new Error(label + " must be at least " + minimum + " characters.");
  }
  if (text.length > maximum) {
    throw new Error(label + " must be no more than " + maximum + " characters.");
  }
  return text;
}

function requireName(value, label) {
  const text = requireLength(value, label, 2, 60);
  for (let i = 0; i < text.length; i++) {
    if (NAME_CHARACTERS.indexOf(text[i]) === -1) {
      throw new Error(label + " can only contain letters, spaces, apostrophes and hyphens.");
    }
  }
  return text;
}

function requireEmail(value) {
  const text = requireLength(value, "Email", 5, 80);
  const at = text.indexOf("@");
  const dot = text.lastIndexOf(".");
  const hasSpace = text.indexOf(" ") !== -1;
  if (at < 1 || dot < at + 2 || dot === text.length - 1 || hasSpace) {
    throw new Error("Enter a valid email address, for example name@example.com.");
  }
  return text;
}

/* Jamaican numbers: 10 digits starting with 876 (dashes, spaces and brackets allowed) */
function requirePhone(value, isOptional) {
  let text = value.trim();
  if (text === "" && isOptional) return "";
  text = text.split("-").join("").split(" ").join("");
  text = text.split("(").join("").split(")").join("");
  if (text.indexOf("+1") === 0) text = text.slice(2);
  if (text.length !== 10 || isNaN(Number(text)) || text.indexOf("876") !== 0) {
    throw new Error("Enter a Jamaican phone number such as 876-555-0123.");
  }
  return text.slice(0, 3) + "-" + text.slice(3, 6) + "-" + text.slice(6);
}

function requireScore(value, label) {
  const score = Number(value);
  if (value.trim() === "" || isNaN(score) || score < 0 || score > 100) {
    throw new Error(label + " must be a number from 0 to 100.");
  }
  return score;
}

/* ---------- Message box helper ---------- */
function showMessage(elementId, text, kind) {
  const box = byId(elementId);
  box.textContent = text;
  box.className = "msg " + kind;
}

/* ---------- Sample data, created once per browser ---------- */
function seedData() {
  if (loadData("seeded", false)) return;

  const names = [
    "Kemar Brown",
    "Shanice Campbell",
    "Andre Williams",
    "Tashana Reid",
    "Dwayne Clarke",
    "Jodian Morgan",
    "Rushane Francis",
    "Nadia Thompson",
  ];
  const grades = [7, 7, 8, 9, 9, 10, 11, 11];

  const students = names.map((name, index) => ({
    id: "S" + (1001 + index),
    name: name,
    grade: grades[index],
    semester: SEMESTERS[0],
    email: name.split(" ")[0].toLowerCase() + "@example.com",
    phone: "876-555-01" + (10 + index),
  }));

  const teachers = [
    { id: "t1", name: "Mrs. Patricia Gordon", subjects: ["Mathematics", "Information Technology"] },
    { id: "t2", name: "Mr. Winston Bailey", subjects: ["English Language", "Social Studies"] },
    { id: "t3", name: "Ms. Alicia Henry", subjects: ["Integrated Science"] },
  ];

  const grade_book = {};
  const fees = {};
  students.forEach((student, index) => {
    grade_book[student.id] = {};
    SUBJECTS.forEach((subject, position) => {
      grade_book[student.id][subject] = 45 + ((index * 17 + position * 23) % 50);
    });

    let payments = [];
    if (index % 3 === 0) {
      payments = [{ amount: DEFAULT_TUITION, date: "2026-09-01" }];
    } else if (index % 3 === 1) {
      payments = [{ amount: 20000, date: "2026-09-05" }];
    }
    fees[student.id] = { tuition: DEFAULT_TUITION, payments: payments };
  });

  saveData("students", students);
  saveData("teachers", teachers);
  saveData("grades", grade_book);
  saveData("fees", fees);
  saveData("seeded", true);
}

/* ---------- Shared header and footer ---------- */
function buildPageFrame() {
  const session = getSession();
  const page = location.pathname.split("/").pop() || "index.html";
  const links = [
    { href: "index.html", label: "Home" },
    { href: "about.html", label: "About us" },
    { href: "contact.html", label: "Contact us" },
  ];

  let navHtml = "";
  links.forEach((link) => {
    const current = page === link.href ? ' class="current" aria-current="page"' : "";
    navHtml += `<a href="${link.href}"${current}>${link.label}</a>`;
  });

  if (session !== null) {
    const current = page === "dashboard.html" ? ' class="current"' : "";
    navHtml += `<a href="dashboard.html"${current}>Dashboard</a>`;
    navHtml += `<a href="#" id="signOut">Sign out</a>`;
  } else {
    navHtml += `<a class="cta" href="login.html">Portal login</a>`;
  }

  byId("siteHeader").innerHTML = `
    <div class="bar-inner">
      <a class="brand" href="index.html">
        <span class="crest" aria-hidden="true">A</span>${escapeHtml(SCHOOL_NAME)}
      </a>
      <button type="button" class="menu-toggle" id="menuToggle"
              aria-label="Toggle menu">Menu</button>
      <nav class="nav" id="mainNav" aria-label="Main">${navHtml}</nav>
    </div>`;

  byId("menuToggle").addEventListener("click", (event) => {
    const isOpen = byId("mainNav").classList.toggle("open");
    event.currentTarget.textContent = isOpen ? "Close" : "Menu";
  });

  if (session !== null) {
    byId("signOut").addEventListener("click", (event) => {
      event.preventDefault();
      clearSession();
      location.href = "index.html";
    });
  }

  byId("siteFooter").textContent =
    "\u00A9 " + COPYRIGHT_YEAR + " " + SCHOOL_NAME + ", " + SCHOOL_ADDRESS + ". " + SCHOOL_MOTTO;
}

seedData();
buildPageFrame();