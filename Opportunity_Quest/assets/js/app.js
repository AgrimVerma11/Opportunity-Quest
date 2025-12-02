// assets/js/app.js

(function () {
  /* ----------------- LocalStorage helpers & keys ----------------- */

  const STORAGE_KEYS = {
    USERS: "oq_users",
    CURRENT_USER: "oq_current_user",
    OPPS: "oq_opportunities",
    BOOKMARKS: "oq_bookmarks",
    PENDING_PROFS: "oq_pending_professors",
    APPLICATIONS: "oq_applications"
  };

  function readLS(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeLS(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  /* ----------------- Bootstrapping ----------------- */

  document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page || "";

    setYear();
    initNavToggle();
    seedDemoData();

    if (page === "auth") initAuthPage();
    if (page === "student") initStudentDashboard();
    if (page === "professor") initProfessorDashboard();
    if (page === "admin") initAdminDashboard();
  });

  function setYear() {
    const el = document.getElementById("year");
    if (el) el.textContent = new Date().getFullYear();
  }

  function initNavToggle() {
    const toggle = document.querySelector(".nav-toggle");
    const links = document.querySelector(".nav-links");
    if (!toggle || !links) return;
    toggle.addEventListener("click", () => {
      links.classList.toggle("open");
    });
  }

  /* ----------------- Demo data seeding ----------------- */

  function seedDemoData() {
    if (!readLS(STORAGE_KEYS.OPPS, null)) {
      const today = new Date();
      const plusDays = (n) => {
        const d = new Date(today);
        d.setDate(d.getDate() + n);
        return d.toISOString().slice(0, 10);
      };

      const demoOpps = [
        {
          id: "opp1",
          title: "NLP Research Assistant (BERT & LLMs)",
          type: "Research",
          department: "CSE",
          deadline: plusDays(10),
          description:
            "Work with the AI lab on fine-tuning transformer models on low-resource languages.",
          eligibility: "CGPA ≥ 8.0, strong Python skills, basic ML background.",
          postedBy: "Prof. Ahuja"
        },
        {
          id: "opp2",
          title: "Embedded Systems Internship with Robotics Club",
          type: "Internship",
          department: "ECE",
          deadline: plusDays(20),
          description:
            "Assist in building and testing sensor modules for autonomous robots used in competitions.",
          eligibility: "Comfortable with C/C++, microcontrollers and debugging.",
          postedBy: "Prof. Rao"
        },
        {
          id: "opp3",
          title: "Capstone Project: Smart Energy Monitoring Dashboard",
          type: "Project",
          department: "CSE",
          deadline: plusDays(5),
          description:
            "Team project focused on building a web dashboard visualizing real-time energy usage.",
          eligibility: "JS/React preferred, basic data visualization.",
          postedBy: "Prof. Kaur"
        }
      ];
      writeLS(STORAGE_KEYS.OPPS, demoOpps);
    }

    if (!readLS(STORAGE_KEYS.PENDING_PROFS, null)) {
      writeLS(STORAGE_KEYS.PENDING_PROFS, [
        { id: "p1", name: "Dr. Meera Sharma", dept: "CSE", email: "meera@univ.edu" },
        { id: "p2", name: "Dr. Anil Kumar", dept: "ECE", email: "anil@univ.edu" }
      ]);
    }

    if (!readLS(STORAGE_KEYS.APPLICATIONS, null)) {
      writeLS(STORAGE_KEYS.APPLICATIONS, []);
    }

    if (!readLS(STORAGE_KEYS.USERS, null)) {
      // seed a default admin for convenience
      writeLS(STORAGE_KEYS.USERS, [
        {
          id: "admin-1",
          role: "admin",
          email: "admin@university.edu",
          password: "admin123",
          name: "System Admin",
          isApproved: true
        }
      ]);
    }
  }

  /* ----------------- Auth page ----------------- */

  function initAuthPage() {
    const tabs = document.querySelectorAll(".auth-tab");
    const form = document.getElementById("authForm");
    const nameRow = document.getElementById("nameRow");
    const submitBtn = document.getElementById("authSubmitBtn");
    const googleBtn = document.getElementById("googleSignInBtn");

    if (!form) return;

    let mode = "login";

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        mode = tab.dataset.mode;
        const isRegister = mode === "register";
        nameRow.classList.toggle("hidden", !isRegister);
        submitBtn.textContent = isRegister ? "Create account" : "Continue";
      });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const role = form.role.value;
      const email = form.email.value.trim();
      const password = form.password.value;
      const fullName = form.fullName ? form.fullName.value.trim() : "";

      if (!email || !password) return;

      if (mode === "register") {
        handleRegister({ role, email, password, fullName });
      } else {
        handleLogin({ role, email, password });
      }
    });

    if (googleBtn) {
      googleBtn.addEventListener("click", () => {
        showToast("Google Sign-In demo. Plug in real auth later.");
      });
    }
  }

  function handleRegister({ role, email, password, fullName }) {
    let users = readLS(STORAGE_KEYS.USERS, []);
    if (users.find((u) => u.email === email)) {
      showToast("An account with this email already exists.");
      return;
    }

    const user = {
      id: Date.now().toString(),
      role,
      email,
      password,
      name: fullName || email.split("@")[0],
      isApproved: role === "professor" ? false : true
    };

    users.push(user);
    writeLS(STORAGE_KEYS.USERS, users);

    if (role === "professor") {
      const pending = readLS(STORAGE_KEYS.PENDING_PROFS, []);
      pending.push({
        id: user.id,
        name: user.name,
        dept: "Not set",
        email: user.email
      });
      writeLS(STORAGE_KEYS.PENDING_PROFS, pending);
      showToast("Professor account created. Pending admin approval.");
      return;
    }

    writeLS(STORAGE_KEYS.CURRENT_USER, user);
    showToast("Account created. Redirecting…");
    redirectToRoleDashboard(role);
  }

  function handleLogin({ role, email, password }) {
    let users = readLS(STORAGE_KEYS.USERS, []);
    let existing = users.find((u) => u.email === email && u.password === password);

    if (!existing) {
      // For convenience during demo, auto-create non-professor users on first login
      const auto = {
        id: Date.now().toString(),
        role,
        email,
        password,
        name: email.split("@")[0],
        isApproved: role === "professor" ? false : true
      };
      users.push(auto);
      writeLS(STORAGE_KEYS.USERS, users);

      if (role === "professor") {
        const pending = readLS(STORAGE_KEYS.PENDING_PROFS, []);
        pending.push({
          id: auto.id,
          name: auto.name,
          dept: "Not set",
          email: auto.email
        });
        writeLS(STORAGE_KEYS.PENDING_PROFS, pending);
        showToast("Professor account created. Pending admin approval.");
        return;
      }

      writeLS(STORAGE_KEYS.CURRENT_USER, auto);
      showToast("Demo login created for you. Redirecting…");
      redirectToRoleDashboard(role);
      return;
    }

    if (existing.role !== role) {
      showToast(`You are registered as ${existing.role}, not ${role}.`);
      return;
    }

    if (role === "professor" && existing.isApproved === false) {
      showToast("Your professor account is pending admin approval.");
      return;
    }

    writeLS(STORAGE_KEYS.CURRENT_USER, existing);
    showToast("Welcome back. Redirecting…");
    redirectToRoleDashboard(role);
  }

  function redirectToRoleDashboard(role) {
    setTimeout(() => {
      if (role === "student") window.location.href = "student-dashboard.html";
      else if (role === "professor") window.location.href = "professor-dashboard.html";
      else if (role === "admin") window.location.href = "admin-dashboard.html";
    }, 500);
  }

  /* ----------------- Student dashboard ----------------- */

  function initStudentDashboard() {
    guardAuth("student");

    const user = readLS(STORAGE_KEYS.CURRENT_USER, null);
    const namePill = document.getElementById("studentNamePill");
    if (user && namePill) namePill.textContent = user.name || "Student";

    attachLogoutHandler();

    const searchInput = document.getElementById("searchQuery");
    const deptSelect = document.getElementById("departmentFilter");
    const typeSelect = document.getElementById("typeFilter");
    const sortSelect = document.getElementById("sortBy");
    const clearBtn = document.getElementById("clearFiltersBtn");
    const grid = document.getElementById("opportunityGrid");
    const badge = document.getElementById("resultCountBadge");
    const bookmarkList = document.getElementById("bookmarkList");
    const applicationsList = document.getElementById("applicationsList");

    let allOpps = readLS(STORAGE_KEYS.OPPS, []);
    let bookmarks = readLS(STORAGE_KEYS.BOOKMARKS, {});
    let applications = readLS(STORAGE_KEYS.APPLICATIONS, []);

    renderOpps();
    renderBookmarks();
    renderApplications();

    searchInput.addEventListener("input", renderOpps);
    deptSelect.addEventListener("change", renderOpps);
    typeSelect.addEventListener("change", renderOpps);
    sortSelect.addEventListener("change", renderOpps);
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      deptSelect.value = "";
      typeSelect.value = "";
      sortSelect.value = "deadline";
      renderOpps();
    });

    function renderOpps() {
      const query = searchInput.value.toLowerCase().trim();
      const dept = deptSelect.value;
      const type = typeSelect.value;
      const sortBy = sortSelect.value;

      let list = [...allOpps];

      if (query) {
        list = list.filter((o) =>
          (o.title + " " + o.description + " " + (o.eligibility || "")).toLowerCase().includes(query)
        );
      }
      if (dept) list = list.filter((o) => o.department === dept);
      if (type) list = list.filter((o) => o.type === type);

      list.sort((a, b) => {
        if (sortBy === "deadline") {
          return new Date(a.deadline) - new Date(b.deadline);
        }
        if (sortBy === "recent") {
          return b.id.localeCompare(a.id);
        }
        return 0;
      });

      grid.innerHTML = "";
      const tmpl = document.getElementById("opportunityCardTemplate");

      list.forEach((opp) => {
        const node = tmpl.content.firstElementChild.cloneNode(true);
        node.querySelector(".opp-title").textContent = opp.title;
        node.querySelector(".opp-meta").textContent =
          `${opp.type} · ${opp.department} · Posted by ${opp.postedBy}`;
        node.querySelector(".opp-desc").textContent = opp.description;
        node.querySelector(".deadline-chip").textContent = `Deadline: ${opp.deadline}`;

        const bookmarkBtn = node.querySelector(".bookmark-btn");
        const isBookmarked = Boolean(bookmarks[opp.id]);
        if (isBookmarked) bookmarkBtn.classList.add("active");

        bookmarkBtn.addEventListener("click", () => {
          if (bookmarks[opp.id]) {
            delete bookmarks[opp.id];
          } else {
            bookmarks[opp.id] = {
              id: opp.id,
              title: opp.title,
              deadline: opp.deadline
            };
          }
          writeLS(STORAGE_KEYS.BOOKMARKS, bookmarks);
          renderBookmarks();
          renderOpps();
        });

        const applyBtn = node.querySelector(".apply-btn");
        applyBtn.addEventListener("click", () => openApplyModal(opp));

        grid.appendChild(node);
      });

      badge.textContent = `${list.length} result${list.length !== 1 ? "s" : ""}`;
    }

    function renderBookmarks() {
      bookmarkList.innerHTML = "";
      const values = Object.values(bookmarks);
      if (!values.length) {
        const li = document.createElement("li");
        li.textContent = "No bookmarks yet.";
        li.style.color = "#6b7280";
        bookmarkList.appendChild(li);
        return;
      }

      values
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .forEach((bm) => {
          const li = document.createElement("li");
          li.textContent = `${bm.title} · ${bm.deadline}`;
          bookmarkList.appendChild(li);
        });
    }

    function renderApplications() {
      if (!applicationsList || !user) return;

      applicationsList.innerHTML = "";

      const myApps = applications
        .filter((a) => a.studentId === user.id)
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

      if (!myApps.length) {
        const li = document.createElement("li");
        li.textContent = "No applications submitted yet.";
        li.style.color = "#6b7280";
        applicationsList.appendChild(li);
        return;
      }

      myApps.forEach((app) => {
        const li = document.createElement("li");
        const status = app.status || "Pending";
        li.textContent = `${app.oppTitle} · ${status}`;

        if (status === "Approved") {
          li.style.border = "1px solid #22c55e";
        } else if (status === "Rejected") {
          li.style.border = "1px solid #ef4444";
        }

        applicationsList.appendChild(li);
      });
    }

    /* Apply modal logic */

    const modal = document.getElementById("applyModal");
    const applyTitle = document.getElementById("applyModalTitle");
    const applyForm = document.getElementById("applyForm");
    const cancelBtn = document.getElementById("cancelApplyBtn");

    let activeOpp = null;

    function openApplyModal(opp) {
      activeOpp = opp;
      applyTitle.textContent = opp.title;
      applyForm.reset();
      modal.classList.remove("hidden");
    }

    cancelBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
      activeOpp = null;
    });

    applyForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!activeOpp || !user) return;

      const resume = document.getElementById("resumeLink").value.trim();
      const note = document.getElementById("note").value.trim();
      if (!resume) return;

      const now = new Date().toISOString();

      let existing = applications.find(
        (a) => a.oppId === activeOpp.id && a.studentId === user.id
      );

      if (existing) {
        existing.resumeLink = resume;
        existing.note = note;
        existing.submittedAt = now;
        existing.status = "Pending";
      } else {
        existing = {
          id: `app-${Date.now()}`,
          oppId: activeOpp.id,
          oppTitle: activeOpp.title,
          studentId: user.id,
          studentName: user.name || user.email,
          resumeLink: resume,
          note,
          status: "Pending",
          submittedAt: now
        };
        applications.push(existing);
      }

      writeLS(STORAGE_KEYS.APPLICATIONS, applications);

      modal.classList.add("hidden");
      showToast(`Application submitted to “${activeOpp.title}”.`);
      activeOpp = null;
      renderApplications();
    });
  }

  /* ----------------- Professor dashboard ----------------- */

  function initProfessorDashboard() {
    guardAuth("professor");
    attachLogoutHandler();

    const user = readLS(STORAGE_KEYS.CURRENT_USER, null);
    const pill = document.getElementById("profNamePill");
    if (user && pill) pill.textContent = user.name || "Professor";

    const form = document.getElementById("createOpportunityForm");
    const listContainer = document.getElementById("profOppList");
    const appsContainer = document.getElementById("profApplicationsList");

    let opps = readLS(STORAGE_KEYS.OPPS, []);
    let applications = readLS(STORAGE_KEYS.APPLICATIONS, []);

    function profName() {
      return user ? user.name || "Professor" : "Professor";
    }

    renderProfOpps();
    renderProfApplications();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = document.getElementById("oppTitle").value.trim();
      const type = document.getElementById("oppType").value;
      const department = document.getElementById("oppDept").value;
      const deadline = document.getElementById("oppDeadline").value;
      const description = document.getElementById("oppDesc").value.trim();
      const eligibility = document.getElementById("oppEligibility").value.trim();

      if (!title || !deadline || !description) {
        showToast("Please fill in the required fields.");
        return;
      }

      const newOpp = {
        id: `opp-${Date.now()}`,
        title,
        type,
        department,
        deadline,
        description,
        eligibility,
        postedBy: profName()
      };

      opps.push(newOpp);
      writeLS(STORAGE_KEYS.OPPS, opps);
      renderProfOpps();
      form.reset();
      showToast("Opportunity published.");
    });

    function renderProfOpps() {
      listContainer.innerHTML = "";
      const mine = opps.filter((o) => o.postedBy === profName());
      if (!mine.length) {
        listContainer.innerHTML =
          "<p class='muted'>No opportunities created yet. Use the form above to publish one.</p>";
        return;
      }

      mine
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .forEach((opp) => {
          const card = document.createElement("article");
          card.className = "card";

          const header = document.createElement("div");
          header.className = "card-header-row";
          const h3 = document.createElement("h3");
          h3.className = "opp-title";
          h3.textContent = opp.title;
          const badge = document.createElement("span");
          badge.className = "chip";
          const isExpired = new Date(opp.deadline) < new Date();
          badge.textContent = isExpired ? "Expired" : "Active";
          header.append(h3, badge);

          const meta = document.createElement("p");
          meta.className = "opp-meta";
          meta.textContent = `${opp.type} · ${opp.department} · Deadline ${opp.deadline}`;

          const desc = document.createElement("p");
          desc.className = "opp-desc";
          desc.textContent = opp.description;

          const footer = document.createElement("div");
          footer.className = "card-footer-row";
          const elig = document.createElement("span");
          elig.className = "chip";
          elig.textContent = opp.eligibility || "No specific eligibility.";
          const removeBtn = document.createElement("button");
          removeBtn.className = "btn small-btn ghost-btn";
          removeBtn.textContent = "Delete";
          removeBtn.addEventListener("click", () => {
            opps = opps.filter((o) => o.id !== opp.id);
            applications = applications.filter((a) => a.oppId !== opp.id);
            writeLS(STORAGE_KEYS.OPPS, opps);
            writeLS(STORAGE_KEYS.APPLICATIONS, applications);
            renderProfOpps();
            renderProfApplications();
            showToast("Opportunity and related applications deleted.");
          });
          footer.append(elig, removeBtn);

          card.append(header, meta, desc, footer);
          listContainer.appendChild(card);
        });
    }

    function renderProfApplications() {
      if (!appsContainer || !user) return;

      appsContainer.innerHTML = "";

      const myName = profName();
      const myOppIds = new Set(
        opps.filter((o) => o.postedBy === myName).map((o) => o.id)
      );

      const myApps = applications
        .filter((a) => myOppIds.has(a.oppId))
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

      if (!myApps.length) {
        appsContainer.innerHTML =
          "<p class='muted'>No applications received yet.</p>";
        return;
      }

      myApps.forEach((app) => {
        const card = document.createElement("article");
        card.className = "card";

        const header = document.createElement("div");
        header.className = "card-header-row";

        const left = document.createElement("div");
        left.innerHTML = `
          <strong>${app.studentName}</strong><br />
          <span class="opp-meta">${app.oppTitle}</span>
        `;

        const statusChip = document.createElement("span");
        statusChip.className = "chip";
        statusChip.textContent = app.status || "Pending";

        header.append(left, statusChip);

        const meta = document.createElement("p");
        meta.className = "opp-meta";
        meta.innerHTML = `
          Submitted: ${new Date(app.submittedAt).toLocaleString()}<br />
          <a href="${app.resumeLink}" target="_blank" rel="noopener noreferrer">View resume/portfolio</a>
        `;

        const noteP = document.createElement("p");
        noteP.className = "opp-desc";
        noteP.textContent = app.note || "No additional note from student.";

        const footer = document.createElement("div");
        footer.className = "card-footer-row";

        const approveBtn = document.createElement("button");
        approveBtn.className = "btn small-btn primary-btn";
        approveBtn.textContent = "Approve";

        const rejectBtn = document.createElement("button");
        rejectBtn.className = "btn small-btn ghost-btn";
        rejectBtn.textContent = "Reject";

        approveBtn.addEventListener("click", () => {
          app.status = "Approved";
          writeLS(STORAGE_KEYS.APPLICATIONS, applications);
          renderProfApplications();
          showToast("Application approved.");
        });

        rejectBtn.addEventListener("click", () => {
          app.status = "Rejected";
          writeLS(STORAGE_KEYS.APPLICATIONS, applications);
          renderProfApplications();
          showToast("Application rejected.");
        });

        footer.append(approveBtn, rejectBtn);

        card.append(header, meta, noteP, footer);
        appsContainer.appendChild(card);
      });
    }
  }

  /* ----------------- Admin dashboard ----------------- */

  function initAdminDashboard() {
    guardAuth("admin");
    attachLogoutHandler();

    const pendingList = document.getElementById("pendingProfList");
    const statsGrid = document.getElementById("statsGrid");

    let pending = readLS(STORAGE_KEYS.PENDING_PROFS, []);
    let users = readLS(STORAGE_KEYS.USERS, []);
    const opps = readLS(STORAGE_KEYS.OPPS, []);

    renderPending();
    renderStats();

    function renderPending() {
      pendingList.innerHTML = "";
      if (!pending.length) {
        pendingList.innerHTML =
          "<p class='muted'>No pending professor verification requests.</p>";
        return;
      }

      pending.forEach((prof) => {
        const card = document.createElement("article");
        card.className = "card";

        const row = document.createElement("div");
        row.className = "card-header-row";

        const left = document.createElement("div");
        left.innerHTML =
          `<strong>${prof.name}</strong><br />` +
          `<span class="opp-meta">${prof.dept} · ${prof.email}</span>`;

        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.gap = "0.4rem";

        const approveBtn = document.createElement("button");
        approveBtn.className = "btn small-btn primary-btn";
        approveBtn.textContent = "Approve";

        const rejectBtn = document.createElement("button");
        rejectBtn.className = "btn small-btn ghost-btn";
        rejectBtn.textContent = "Reject";

        approveBtn.addEventListener("click", () => {
          users = users.map((u) =>
            u.email === prof.email || u.id === prof.id
              ? { ...u, isApproved: true }
              : u
          );
          writeLS(STORAGE_KEYS.USERS, users);

          pending = pending.filter((p) => p.id !== prof.id);
          writeLS(STORAGE_KEYS.PENDING_PROFS, pending);
          renderPending();
          renderStats();
          showToast(`Approved ${prof.name}.`);
        });

        rejectBtn.addEventListener("click", () => {
          users = users.filter((u) => u.email !== prof.email && u.id !== prof.id);
          writeLS(STORAGE_KEYS.USERS, users);

          pending = pending.filter((p) => p.id !== prof.id);
          writeLS(STORAGE_KEYS.PENDING_PROFS, pending);
          renderPending();
          renderStats();
          showToast(`Rejected ${prof.name}.`);
        });

        actions.append(approveBtn, rejectBtn);
        row.append(left, actions);
        card.appendChild(row);
        pendingList.appendChild(card);
      });
    }

    function renderStats() {
      const studentCount = users.filter((u) => u.role === "student").length;
      const profCount = users.filter((u) => u.role === "professor").length;
      const adminCount = users.filter((u) => u.role === "admin").length;

      const now = new Date();
      const activeOpps = opps.filter((o) => new Date(o.deadline) >= now).length;
      const expiredOpps = opps.length - activeOpps;

      const stats = [
        { label: "Students", value: studentCount },
        { label: "Professors", value: profCount },
        { label: "Admins", value: adminCount },
        { label: "Active Opportunities", value: activeOpps },
        { label: "Expired Opportunities", value: expiredOpps }
      ];

      statsGrid.innerHTML = "";
      stats.forEach((s) => {
        const card = document.createElement("div");
        card.className = "stats-card";
        const label = document.createElement("span");
        label.className = "stats-label";
        label.textContent = s.label;
        const value = document.createElement("span");
        value.className = "stats-value";
        value.textContent = s.value;
        card.append(label, value);
        statsGrid.appendChild(card);
      });
    }
  }

  /* ----------------- Shared helpers ----------------- */

  function guardAuth(expectedRole) {
    const user = readLS(STORAGE_KEYS.CURRENT_USER, null);
    if (!user || user.role !== expectedRole) {
      showToast("Please log in with the correct role first.");
      setTimeout(() => {
        window.location.href = "index.html";
      }, 700);
    }
  }

  function attachLogoutHandler() {
    const btn = document.getElementById("logoutBtn");
    if (!btn) return;
    btn.addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      showToast("Logged out.");
      setTimeout(() => {
        window.location.href = "index.html";
      }, 500);
    });
  }

  let toastTimeout = null;
  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove("show");
    }, 2200);
  }
})();
