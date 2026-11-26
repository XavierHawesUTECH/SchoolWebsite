//Garren Burke - [2510158] & Xavier Hawes - [2504358] @ Thursday 1-3pm


"use strict";

function startDashboard() {
    const session = getSession();
    if (session === null) {
        location.href = "login.html";
        return;
    }

    const view = byId("view");
    const isReadOnly = session.role === "viewer";
    let flashStudentId = ""; // row to highlight after a change
    let teacherStep = { subject: "", grade: 0 }; // teacher workflow state

    /* ---------- Data access (arrays and objects held in localStorage) ---------- */
    const getStudents = () => loadData("students", []);
    const getTeachers = () => loadData("teachers", []);
    const getGrades = () => loadData("grades", {});
    const getFees = () => loadData("fees", {});

    function findStudent(id) {
        const matches = getStudents().filter(student => student.id === id);
        return matches.length > 0 ? matches[0] : null;
    }

    function scoresOf(id) {
        const book = getGrades();
        return book[id] ? book[id] : {};
    }

    function feeOf(id) {
        const fees = getFees();
        return fees[id] ? fees[id] : { tuition: 0, payments: [] };
    }

    function totalPaid(id) {
        return feeOf(id).payments.reduce((sum, payment) => sum + payment.amount, 0);
    }

    function balanceOf(id) {
        const owing = feeOf(id).tuition - totalPaid(id);
        return owing > 0 ? owing : 0;
    }

    /* Paid: nothing owed. Pending: part paid. Outstanding: nothing paid. */
    function feeStatus(id) {
        if (balanceOf(id) === 0) return "Paid";
        return totalPaid(id) > 0 ? "Pending" : "Outstanding";
    }

    function averageOf(id) {
        const scores = Object.values(scoresOf(id));
        if (scores.length === 0) return null;
        return scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }

    function averageText(id) {
        const average = averageOf(id);
        return average === null ? "-" : String(roundOne(average));
    }

    function letterFor(score) {
        if (score >= 85) return "A";
        else if (score >= 70) return "B";
        else if (score >= 55) return "C";
        else if (score >= 40) return "D";
        else return "E";
    }

    function remarkFor(score) {
        if (score >= 85) return "Excellent";
        else if (score >= 70) return "Very good";
        else if (score >= 55) return "Satisfactory";
        else if (score >= 40) return "Needs improvement";
        else return "At risk";
    }

    function badgeFor(id) {
        const status = feeStatus(id);
        return `<span class="badge ${status}">${status}</span>`;
    }

    /* ---------- Small HTML builders ---------- */
    function gradeOptions(selected, includeAll) {
        let html = includeAll ? '<option value="">All grades</option>' : "";
        GRADE_LEVELS.forEach(grade => {
            const chosen = grade === selected ? " selected" : "";
            html += `<option value="${grade}"${chosen}>Grade ${grade}</option>`;
        });
        return html;
    }

    function semesterOptions(selected) {
        return SEMESTERS.map(semester => {
            const chosen = semester === selected ? " selected" : "";
            return `<option value="${semester}"${chosen}>${semester}</option>`;
        }).join("");
    }

    const readOnlyNote = isReadOnly
        ? '<p class="readonly-note">Read-only view. Records cannot be edited here.</p>'
        : "";

    /* ---------- Tabs for each role ---------- */
    const TABS = {
        admin: [
            { key: "students", label: "Student registry" },
            { key: "grades", label: "Academic matrix" },
            { key: "finance", label: "Financial ledger" },
            { key: "search", label: "Search" },
            { key: "reports", label: "Reports" },
        ],
        teacher: [
            { key: "entry", label: "Enter grades" },
            { key: "cards", label: "Report cards" },
            { key: "search", label: "Search" },
        ],
        viewer: [
            { key: "search", label: "Search" },
            { key: "reports", label: "Reports" },
        ],
    };

    function openScreen(key) {
        all("#tabs button").forEach(button => {
            button.classList.toggle("active", button.value === key);
        });

        if (key === "students") showStudents("");
        else if (key === "grades") showGrades();
        else if (key === "finance") showFinance();
        else if (key === "entry") showTeacherEntry();
        else if (key === "cards") showReportCards();
        else if (key === "search") showSearch();
        else if (key === "reports") showReports();
    }

    /* ====================================================
       ADMIN: student registry (create, read, update, delete)
       ==================================================== */
    function showStudents(editId) {
        const editing = editId === "" ? null : findStudent(editId);
        const current = editing || { id: "", name: "", grade: 7, semester: SEMESTERS[0], email: "", phone: "" };

        view.innerHTML = `
            <h2>Student registry</h2>
            <form id="studentForm" class="card">
                <fieldset class="grid-form">
                    <legend>${editing ? "Update " + escapeHtml(current.id) : "Register a new student"}</legend>
                    <input type="hidden" id="studentId" value="${escapeHtml(current.id)}">
                    <label for="studentName">Full name
                        <input id="studentName" type="text" required placeholder=" " value="${escapeHtml(current.name)}">
                    </label>
                    <label for="studentGrade">Grade
                        <select id="studentGrade">${gradeOptions(current.grade, false)}</select>
                    </label>
                    <label for="studentSemester">Semester cohort
                        <select id="studentSemester">${semesterOptions(current.semester)}</select>
                    </label>
                    <label for="studentEmail">Email
                        <input id="studentEmail" type="email" required placeholder="name@example.com" value="${escapeHtml(current.email)}">
                    </label>
                    <label for="studentPhone">Guardian phone
                        <input id="studentPhone" type="text" required placeholder="876-555-0123" value="${escapeHtml(current.phone)}">
                    </label>
                    <div class="full">
                        <button type="submit">${editing ? "Save changes" : "Register student"}</button>
                        ${editing ? '<button type="button" class="secondary" id="cancelEdit">Cancel</button>' : ""}
                    </div>
                </fieldset>
            </form>
            <div id="studentMessage" class="msg" role="status"></div>

            <label for="cohortFilter">Show cohort
                <select id="cohortFilter">
                    <option value="">All semesters</option>${semesterOptions("")}
                </select>
            </label>
            <div class="table-wrap card">
                <table>
                    <caption>Registered students</caption>
                    <thead>
                        <tr><th>ID</th><th>Name</th><th>Grade</th><th>Cohort</th><th>Actions</th></tr>
                    </thead>
                    <tbody id="studentRows"></tbody>
                    <tfoot><tr><td colspan="5" id="studentCount"></td></tr></tfoot>
                </table>
            </div>`;

        function drawRows() {
            const cohort = byId("cohortFilter").value;
            const rows = getStudents().filter(student => cohort === "" || student.semester === cohort);

            if (rows.length === 0) {
                byId("studentRows").innerHTML = '<tr><td colspan="5">No students yet. Use the form above to register one.</td></tr>';
            } else {
                byId("studentRows").innerHTML = rows.map(student => `
                    <tr>
                        <td>${student.id}</td>
                        <td>${escapeHtml(student.name)}</td>
                        <td>${student.grade}</td>
                        <td>${student.semester}</td>
                        <td>
                            <button type="button" class="small edit-student" value="${student.id}">Edit</button>
                            <button type="button" class="small danger delete-student" value="${student.id}">Delete</button>
                        </td>
                    </tr>`).join("");
            }
            byId("studentCount").textContent = rows.length + " student(s) shown";

            onAll(".edit-student", "click", event => {
                showStudents(event.currentTarget.value);
                window.scrollTo(0, 0);
            });
            onAll(".delete-student", "click", event => {
                const id = event.currentTarget.value;
                if (confirm("Delete " + id + " and all of their grades and fees?")) {
                    saveData("students", getStudents().filter(student => student.id !== id));
                    const book = getGrades();
                    const fees = getFees();
                    delete book[id];
                    delete fees[id];
                    saveData("grades", book);
                    saveData("fees", fees);
                    showStudents("");
                    showMessage("studentMessage", id + " was deleted.", "ok");
                }
            });
        }

        drawRows();
        byId("cohortFilter").addEventListener("change", drawRows);

        if (editing) {
            byId("cancelEdit").addEventListener("click", () => showStudents(""));
        }

        byId("studentForm").addEventListener("submit", event => {
            event.preventDefault();
            try {
                const record = {
                    name: requireName(byId("studentName").value, "Name"),
                    grade: Number(byId("studentGrade").value),
                    semester: byId("studentSemester").value,
                    email: requireEmail(byId("studentEmail").value),
                    phone: requirePhone(byId("studentPhone").value, false),
                };
                const students = getStudents();
                const id = byId("studentId").value;

                if (id !== "") {
                    students.forEach(student => {
                        if (student.id === id) {
                            student.name = record.name;
                            student.grade = record.grade;
                            student.semester = record.semester;
                            student.email = record.email;
                            student.phone = record.phone;
                        }
                    });
                    saveData("students", students);
                    showStudents("");
                    showMessage("studentMessage", id + " was updated.", "ok");
                } else {
                    let highest = 1000;
                    for (let i = 0; i < students.length; i++) {
                        const number = Number(students[i].id.slice(1));
                        if (number > highest) highest = number;
                    }
                    const newId = "S" + (highest + 1);
                    students.push({ id: newId, ...record });
                    const fees = getFees();
                    fees[newId] = { tuition: DEFAULT_TUITION, payments: [] };
                    saveData("fees", fees);
                    saveData("students", students);
                    showStudents("");
                    showMessage("studentMessage", record.name + " was registered as " + newId + ".", "ok");
                }
            } catch (error) {
                showMessage("studentMessage", error.message, "error");
            }
        });
    }

    /* ====================================================
       ADMIN: academic matrix (grades for every subject)
       ==================================================== */
    function showGrades() {
        view.innerHTML = `
            <h2>Academic matrix</h2>
            <label for="matrixGrade">Grade
                <select id="matrixGrade">${gradeOptions(0, true)}</select>
            </label>
            <div class="table-wrap card">
                <table>
                    <caption>Scores out of 100</caption>
                    <thead>
                        <tr><th>Student</th>${SUBJECTS.map(subject => `<th>${subject}</th>`).join("")}<th>Average</th></tr>
                    </thead>
                    <tbody id="matrixRows"></tbody>
                </table>
            </div>
            <button type="button" id="saveMatrix">Save all grades</button>
            <div id="matrixMessage" class="msg" role="status"></div>`;

        function drawMatrix() {
            const grade = byId("matrixGrade").value;
            const book = getGrades();
            const rows = getStudents().filter(student => grade === "" || student.grade === Number(grade));

            byId("matrixRows").innerHTML = rows.map(student => {
                const cells = SUBJECTS.map(subject => {
                    const score = book[student.id] && book[student.id][subject] !== undefined ? book[student.id][subject] : "";
                    return `<td><input class="score" type="number" name="${student.id}|${subject}" value="${score}" aria-label="${escapeHtml(student.name)}, ${subject}"></td>`;
                }).join("");
                return `<tr><td>${escapeHtml(student.name)}</td>${cells}<td>${averageText(student.id)}</td></tr>`;
            }).join("");
        }

        drawMatrix();
        byId("matrixGrade").addEventListener("change", drawMatrix);

        byId("saveMatrix").addEventListener("click", () => {
            try {
                const book = getGrades();
                all(".score").forEach(input => {
                    if (input.value.trim() === "") return;
                    const parts = input.name.split("|");
                    const score = requireScore(input.value, parts[1] + " score for " + parts[0]);
                    if (!book[parts[0]]) book[parts[0]] = {};
                    book[parts[0]][parts[1]] = score;
                });
                saveData("grades", book);
                drawMatrix();
                showMessage("matrixMessage", "Grades saved.", "ok");
            } catch (error) {
                showMessage("matrixMessage", error.message + " Nothing was saved.", "error");
            }
        });
    }

    /* ====================================================
       ADMIN: financial ledger (tuition, payments, live status)
       ==================================================== */
    function showFinance() {
        const students = getStudents();
        const flashId = flashStudentId;
        flashStudentId = "";

        let tuitionTotal = 0;
        let paidTotal = 0;
        let balanceTotal = 0;
        students.forEach(student => {
            tuitionTotal += feeOf(student.id).tuition;
            paidTotal += totalPaid(student.id);
            balanceTotal += balanceOf(student.id);
        });

        const studentOptions = students.map(student => `<option value="${student.id}">${escapeHtml(student.name)} (${student.id})</option>`).join("");

        const rows = students.map(student => `
            <tr${student.id === flashId ? ' class="flash"' : ""}>
                <td>${escapeHtml(student.name)}</td>
                <td>${formatMoney(feeOf(student.id).tuition)}</td>
                <td>${formatMoney(totalPaid(student.id))}</td>
                <td>${formatMoney(balanceOf(student.id))}</td>
                <td>${badgeFor(student.id)}</td>
                <td><button type="button" class="small secondary set-tuition" value="${student.id}">Set tuition</button></td>
            </tr>`).join("");

        view.innerHTML = `
            <h2>Financial ledger</h2>
            <form id="paymentForm" class="card">
                <fieldset class="grid-form">
                    <legend>Record a payment</legend>
                    <label for="payStudent">Student
                        <select id="payStudent">${studentOptions}</select>
                    </label>
                    <label for="payAmount">Amount (J$)
                        <input id="payAmount" type="number" required placeholder="e.g. 10000">
                    </label>
                    <label for="payDate">Date
                        <input id="payDate" type="date" required>
                    </label>
                    <div class="full"><button type="submit">Record payment</button></div>
                </fieldset>
            </form>
            <div id="financeMessage" class="msg" role="status"></div>

            <div class="table-wrap card">
                <table>
                    <caption>Tuition accounts</caption>
                    <thead>
                        <tr><th>Student</th><th>Tuition</th><th>Paid</th><th>Balance</th><th>Status</th><th></th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                    <tfoot>
                        <tr>
                            <td>Total</td><td>${formatMoney(tuitionTotal)}</td>
                            <td>${formatMoney(paidTotal)}</td><td>${formatMoney(balanceTotal)}</td>
                            <td colspan="2"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>`;

        byId("paymentForm").addEventListener("submit", event => {
            event.preventDefault();
            try {
                const id = byId("payStudent").value;
                const amount = Number(byId("payAmount").value);
                const date = byId("payDate").value;
                if (isNaN(amount) || amount <= 0) throw new Error("Enter a payment amount greater than 0.");
                if (date === "") throw new Error("Choose the payment date.");

                const fees = getFees();
                if (!fees[id]) fees[id] = { tuition: DEFAULT_TUITION, payments: [] };
                fees[id].payments.push({ amount: amount, date: date });
                saveData("fees", fees);

                flashStudentId = id;
                showFinance();
                showMessage("financeMessage", "Payment recorded. " + id + " is now " + feeStatus(id) + ".", "ok");
            } catch (error) {
                showMessage("financeMessage", error.message, "error");
            }
        });

        onAll(".set-tuition", "click", event => {
                      const id = event.currentTarget.value;
            const answer = prompt("New tuition amount (J$) for " + id, String(feeOf(id).tuition));
            if (answer === null) return; // cancelled
            try {
                const tuition = Number(answer);
                if (answer.trim() === "" || isNaN(tuition) || tuition < 0) {
                    throw new Error("Tuition must be a number of 0 or more.");
                }
                const fees = getFees();
                fees[id].tuition = tuition;
                saveData("fees", fees);
                flashStudentId = id;
                showFinance();
                showMessage("financeMessage", "Tuition for " + id + " is now " + formatMoney(tuition) + ".", "ok");
            } catch (error) {
                showMessage("financeMessage", error.message, "error");
            }
        });
    }

    /* ====================================================
       TEACHER: subject -> grade -> scores
       ==================================================== */
    function showTeacherEntry() {
        const matches = getTeachers().filter(teacher => teacher.id === session.teacherId);
        const subjects = matches.length > 0 ? matches[0].subjects : [];
        const hasSubject = teacherStep.subject !== "";
        const hasGrade = teacherStep.grade !== 0;

        const steps = `
            <div class="steps">
                <span class="${!hasSubject ? "active" : ""}">1 Subject</span>
                <span class="${hasSubject && !hasGrade ? "active" : ""}">2 Grade</span>
                <span class="${hasGrade ? "active" : ""}">3 Scores</span>
            </div>`;

        if (!hasSubject) {
            view.innerHTML = `
                <h2>Enter grades</h2>${steps}
                <p>Choose a subject you teach.</p>
                ${subjects.map(subject => `<button type="button" class="pick-subject" value="${subject}">${subject}</button>`).join("")}`;
            onAll(".pick-subject", "click", event => {
                teacherStep.subject = event.currentTarget.value;
                showTeacherEntry();
            });
            return;
        }

        if (!hasGrade) {
            const buttons = GRADE_LEVELS.map(grade => {
                const count = getStudents().filter(student => student.grade === grade).length;
                return `<button type="button" class="pick-grade" value="${grade}">Grade ${grade} (${count})</button>`;
            }).join("");
            view.innerHTML = `
                <h2>${teacherStep.subject}</h2>${steps}
                <p>Choose a grade.</p>
                ${buttons}
                <button type="button" class="secondary" id="backToSubjects">Back</button>`;
            onAll(".pick-grade", "click", event => {
                teacherStep.grade = Number(event.currentTarget.value);
                showTeacherEntry();
            });
            byId("backToSubjects").addEventListener("click", () => {
                teacherStep = { subject: "", grade: 0 };
                showTeacherEntry();
            });
            return;
        }

        const classList = getStudents().filter(student => student.grade === teacherStep.grade);
        const rows = classList.map(student => {
            const existing = scoresOf(student.id)[teacherStep.subject];
            const value = existing === undefined ? "" : existing;
            return `
                <tr>
                    <td>${student.id}</td>
                    <td>${escapeHtml(student.name)}</td>
                    <td><input class="entry-score" type="number" name="${student.id}" value="${value}"
                                 aria-label="Score for ${escapeHtml(student.name)}"></td>
                </tr>`;
        }).join("");

        view.innerHTML = `
            <h2>${teacherStep.subject}, Grade ${teacherStep.grade}</h2>${steps}
            <div class="table-wrap card">
                <table>
                    <caption>Enter a score out of 100 for each student</caption>
                    <thead><tr><th>ID</th><th>Student</th><th>Score</th></tr></thead>
                    <tbody>${rows || '<tr><td colspan="3">No students in this grade.</td></tr>'}</tbody>
                </table>
            </div>
            <button type="button" id="saveEntry">Save scores</button>
            <button type="button" class="secondary" id="backToGrades">Back</button>
            <div id="entryMessage" class="msg" role="status"></div>`;

        byId("backToGrades").addEventListener("click", () => {
            teacherStep.grade = 0;
            showTeacherEntry();
        });

        byId("saveEntry").addEventListener("click", () => {
            try {
                const book = getGrades();
                let saved = 0;
                all(".entry-score").forEach(input => {
                    if (input.value.trim() === "") return;
                    const score = requireScore(input.value, "Score for " + input.name);
                    if (!book[input.name]) book[input.name] = {};
                    book[input.name][teacherStep.subject] = score;
                    saved++;
                });
                saveData("grades", book);
                showMessage("entryMessage", saved + " score(s) saved.", "ok");
            } catch (error) {
                showMessage("entryMessage", error.message + " Nothing was saved.", "error");
            }
        });
    }

    /* ====================================================
       TEACHER: report card generator
       ==================================================== */
    function showReportCards() {
        const options = getStudents()
            .map(student => `<option value="${student.id}">${escapeHtml(student.name)} (Grade ${student.grade})</option>`)
            .join("");

        view.innerHTML = `
            <h2>Report card generator</h2>
            <label class="no-print" for="cardStudent">Student
                <select id="cardStudent">
                    <option value="">Choose a student</option>${options}
                </select>
            </label>
            <div id="cardOutput"></div>`;

        byId("cardStudent").addEventListener("change", () => {
            const student = findStudent(byId("cardStudent").value);
            if (student === null) {
                byId("cardOutput").innerHTML = "";
                return;
            }

            const scores = scoresOf(student.id);
            const average = averageOf(student.id);
            const classmates = getStudents().filter(other => other.grade === student.grade);
            const ahead = classmates.filter(other => (averageOf(other.id) || 0) > (average || 0)).length;

            const rows = SUBJECTS.map(subject => {
                if (scores[subject] === undefined) {
                    return `<tr><td>${subject}</td><td colspan="3">Not yet graded</td></tr>`;
                }
                return `<tr><td>${subject}</td><td>${scores[subject]}</td><td>${letterFor(scores[subject])}</td><td>${remarkFor(scores[subject])}</td></tr>`;
            }).join("");

            const averageLine = average === null ? "n/a" : roundOne(average) + " (" + letterFor(average) + ")";

            byId("cardOutput").innerHTML = `
                <article class="report-card">
                    <h3>${escapeHtml(SCHOOL_NAME)}: Report card</h3>
                    <p><strong>${escapeHtml(student.name)}</strong> (${student.id}) &middot; Grade ${student.grade} &middot; ${student.semester}</p>
                    <div class="table-wrap">
                        <table>
                            <thead><tr><th>Subject</th><th>Score</th><th>Grade</th><th>Remark</th></tr></thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                    <p><strong>Average:</strong> ${averageLine}
                       &middot; <strong>Position in grade:</strong> ${ahead + 1} of ${classmates.length}</p>
                </article>
                <p class="no-print"><button type="button" id="printCard">Print report card</button></p>`;

            byId("printCard").addEventListener("click", () => window.print());
        });
    }

    /* ====================================================
       EVERYONE: search profiles, grades and statements (read-only)
       ==================================================== */
    function showSearch() {
        view.innerHTML = `
            <h2>Search records</h2>${readOnlyNote}
            <label for="searchBox">Name or student ID
                <input id="searchBox" type="text" placeholder="Start typing">
            </label>
            <div class="table-wrap card">
                <table>
                    <caption>Matching students</caption>
                    <thead>
                        <tr><th>ID</th><th>Name</th><th>Grade</th><th>Average</th><th>Fees</th><th></th></tr>
                    </thead>
                    <tbody id="searchRows"></tbody>
                </table>
            </div>
            <div id="profile"></div>`;

        function drawSearch() {
            const text = byId("searchBox").value.toLowerCase();
            const rows = getStudents().filter(student =>
                (student.name + " " + student.id).toLowerCase().indexOf(text) !== -1
            );

            if (rows.length === 0) {
                byId("searchRows").innerHTML = '<tr><td colspan="6">No matching students.</td></tr>';
                return;
            }

            byId("searchRows").innerHTML = rows.map(student => `
                <tr>
                    <td>${student.id}</td>
                    <td>${escapeHtml(student.name)}</td>
                    <td>${student.grade}</td>
                    <td>${averageText(student.id)}</td>
                    <td>${badgeFor(student.id)}</td>
                    <td><button type="button" class="small view-student" value="${student.id}">View</button></td>
                </tr>`).join("");

            onAll(".view-student", "click", event => showProfile(event.currentTarget.value));
        }

        function showProfile(id) {
            const student = findStudent(id);
            const scores = scoresOf(id);
            const fee = feeOf(id);

            const scoreLine = SUBJECTS.map(subject =>
                `${subject}: <strong>${scores[subject] === undefined ? "-" : scores[subject]}</strong>`
            ).join(" &middot; ");

            const payments = fee.payments.length === 0
                ? "<li>No payments yet.</li>"
                : fee.payments.map(payment => `<li>${payment.date}: ${formatMoney(payment.amount)}</li>`).join("");

            byId("profile").innerHTML = `
                <article class="card">
                    <h3>${escapeHtml(student.name)}</h3>
                    <p>${student.id} &middot; Grade ${student.grade} &middot; ${student.semester}<br>
                       ${escapeHtml(student.email)} &middot; ${escapeHtml(student.phone)}</p>
                    <h4>Grades</h4>
                    <p>${scoreLine}</p>
                    <h4>Financial statement</h4>
                    <p>Tuition ${formatMoney(fee.tuition)} &middot; Paid ${formatMoney(totalPaid(id))}
                       &middot; Balance ${formatMoney(balanceOf(id))} ${badgeFor(id)}</p>
                    <ul>${payments}</ul>
                </article>`;
        }

        drawSearch();
        byId("searchBox").addEventListener("input", drawSearch);
    }

    /* ====================================================
       ADMIN + VIEWER: filterable reports (no editing controls)
       ==================================================== */
    function showReports() {
        view.innerHTML = `
            <h2>Reports</h2>${readOnlyNote}
            <form class="card" id="reportFilters">
                <fieldset class="grid-form">
                    <legend>Filters</legend>
                    <label for="reportGrade">Grade
                        <select id="reportGrade">${gradeOptions(0, true)}</select>
                    </label>
                    <label for="reportStatus">Fee status
                        <select id="reportStatus">
                            <option value="">All</option>
                            <option value="Paid">Paid</option>
                            <option value="Pending">Pending</option>
                            <option value="Outstanding">Outstanding</option>
                        </select>
                    </label>
                    <label for="reportMinimum">Minimum average
                        <input id="reportMinimum" type="number" value="0">
                    </label>
                </fieldset>
            </form>
            <div id="reportOutput"></div>`;

        function drawReport() {
            const grade = byId("reportGrade").value;
            const status = byId("reportStatus").value;
            const minimum = Number(byId("reportMinimum").value) || 0;
            const book = getGrades();

            const list = getStudents().filter(student =>
                (grade === "" || student.grade === Number(grade)) &&
                (status === "" || feeStatus(student.id) === status) &&
                (averageOf(student.id) || 0) >= minimum
            );

            const bars = SUBJECTS.map((subject, index) => `
                <div class="bar-row">
                    <span class="bar-label">${subject}</span>
                    <div class="bar-fill" id="bar${index}"></div>
                    <span id="barText${index}"></span>
                </div>`).join("");

            let balanceTotal = 0;
            const rows = list.map(student => {
                balanceTotal += balanceOf(student.id);
                return `
                    <tr>
                        <td>${escapeHtml(student.name)}</td>
                        <td>${student.grade}</td>
                        <td>${averageText(student.id)}</td>
                        <td>${badgeFor(student.id)}</td>
                        <td>${formatMoney(balanceOf(student.id))}</td>
                    </tr>`;
            }).join("");

            byId("reportOutput").innerHTML = `
                <article class="card">
                    <h3>${list.length} student(s) match</h3>
                    <p>Average score by subject</p>
                    ${bars}
                </article>
                <div class="table-wrap card">
                    <table>
                        <caption>Student summary</caption>
                        <thead>
                            <tr><th>Student</th><th>Grade</th><th>Average</th><th>Fees</th><th>Balance</th></tr>
                        </thead>
                        <tbody>${rows || '<tr><td colspan="5">No records match these filters.</td></tr>'}</tbody>
                        <tfoot><tr><td colspan="4">Total balance owing</td><td>${formatMoney(balanceTotal)}</td></tr></tfoot>
                    </table>
                </div>`;

            SUBJECTS.forEach((subject, index) => {
                const scores = list
                    .map(student => (book[student.id] ? book[student.id][subject] : undefined))
                    .filter(score => score !== undefined);
                const mean = scores.length === 0 ? 0 : scores.reduce((sum, score) => sum + score, 0) / scores.length;
                byId("bar" + index).style.width = mean + "%";
                byId("barText" + index).textContent = String(roundOne(mean));
            });
        }

        drawReport();
        byId("reportGrade").addEventListener("change", drawReport);
        byId("reportStatus").addEventListener("change", drawReport);
        byId("reportMinimum").addEventListener("input", drawReport);
        byId("reportFilters").addEventListener("submit", event => event.preventDefault());
    }

    /* ---------- Build the tabs and open the first one ---------- */
    byId("welcome").textContent = "Welcome, " + session.name + " (" + session.role + ")";

    const tabs = TABS[session.role];
    byId("tabs").innerHTML = tabs
        .map(tab => `<button type="button" value="${tab.key}">${tab.label}</button>`)
        .join("");

    onAll("#tabs button", "click", event => {
        teacherStep = { subject: "", grade: 0 };
        openScreen(event.currentTarget.value);
    });

    openScreen(tabs[0].key);
}

startDashboard();

