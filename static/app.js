document.addEventListener("DOMContentLoaded", () => {
    const addForm = document.getElementById("add-student-form");
    const submitBtn = document.getElementById("submit-btn");
    const tbody = document.getElementById("students-tbody");
    const searchInput = document.getElementById("search-input");
    const courseFilter = document.getElementById("course-filter");
    const emptyState = document.getElementById("empty-state");
    const emptyStateText = document.getElementById("empty-state-text");
    const studentCount = document.getElementById("student-count");
    const toastContainer = document.getElementById("toast-container");

    function showToast(message, type = "success") {
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3200);
    }

    function escapeHtml(value) {
        const div = document.createElement("div");
        div.textContent = value;
        return div.innerHTML;
    }

    function updateCourseFilterOptions() {
        const currentValue = courseFilter.value;
        const courses = new Set();

        tbody.querySelectorAll("tr").forEach((row) => {
            const course = row.dataset.course;
            if (course) {
                courses.add(course);
            }
        });

        courseFilter.innerHTML = '<option value="">All Courses</option>';
        Array.from(courses)
            .sort((a, b) => a.localeCompare(b))
            .forEach((course) => {
                const option = document.createElement("option");
                option.value = course;
                option.textContent = course;
                courseFilter.appendChild(option);
            });

        if (courses.has(currentValue)) {
            courseFilter.value = currentValue;
        }
    }

    function applyFilters() {
        const query = searchInput.value.trim().toLowerCase();
        const selectedCourse = courseFilter.value;
        const rows = Array.from(tbody.querySelectorAll("tr"));
        let visibleCount = 0;

        rows.forEach((row) => {
            const name = row.dataset.name || "";
            const email = row.dataset.email || "";
            const course = row.dataset.course || "";

            const matchesQuery =
                !query ||
                name.includes(query) ||
                email.includes(query) ||
                course.toLowerCase().includes(query);

            const matchesCourse = !selectedCourse || course === selectedCourse;
            const visible = matchesQuery && matchesCourse;

            row.classList.toggle("hidden", !visible);
            if (visible) {
                visibleCount += 1;
            }
        });

        studentCount.textContent = rows.length;

        if (rows.length === 0) {
            emptyStateText.textContent = "No students found. Add a student using the form on the left.";
            emptyState.classList.remove("hidden");
        } else if (visibleCount === 0) {
            emptyStateText.textContent = "No students match your current search or course filter.";
            emptyState.classList.remove("hidden");
        } else {
            emptyState.classList.add("hidden");
        }
    }

    function createStudentRow(student) {
        const tr = document.createElement("tr");
        tr.className = "row-new";
        tr.dataset.id = student.id;
        tr.dataset.name = student.name.toLowerCase();
        tr.dataset.email = student.email.toLowerCase();
        tr.dataset.course = student.course;

        const initial = student.name ? student.name.charAt(0).toUpperCase() : "?";

        tr.innerHTML = `
            <td class="muted">#${escapeHtml(String(student.id))}</td>
            <td>
                <div class="student-cell">
                    <span class="avatar">${escapeHtml(initial)}</span>
                    <span class="student-name">${escapeHtml(student.name)}</span>
                </div>
            </td>
            <td>${escapeHtml(student.email)}</td>
            <td><span class="badge">${escapeHtml(student.course)}</span></td>
            <td class="muted">${escapeHtml(student.created_at || "")}</td>
            <td class="text-right">
                <form action="/students/${encodeURIComponent(student.id)}/delete"
                      method="POST"
                      class="inline-form delete-form"
                      data-student-id="${escapeHtml(String(student.id))}"
                      data-student-name="${escapeHtml(student.name)}">
                    <button type="submit" class="btn btn-danger btn-sm">Delete</button>
                </form>
            </td>
        `;

        return tr;
    }

    if (addForm) {
        addForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const nameInput = document.getElementById("name");
            const emailInput = document.getElementById("email");
            const courseInput = document.getElementById("course");

            const payload = {
                name: nameInput.value.trim(),
                email: emailInput.value.trim(),
                course: courseInput.value.trim(),
            };

            if (!payload.name || !payload.email || !payload.course) {
                showToast("Please fill in all fields.", "error");
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = "Adding...";

            try {
                const response = await fetch(addForm.action, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify(payload),
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    showToast(result.message || "Could not add student.", "error");
                    return;
                }

                const newRow = createStudentRow(result.student);
                tbody.prepend(newRow);
                addForm.reset();
                updateCourseFilterOptions();
                applyFilters();
                showToast(result.message || "Student added successfully!", "success");
            } catch (error) {
                showToast("Network error while adding student.", "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "+ Add Student";
            }
        });
    }

    tbody.addEventListener("submit", async (event) => {
        const form = event.target.closest(".delete-form");
        if (!form) {
            return;
        }

        event.preventDefault();

        const studentName = form.dataset.studentName || "this student";
        if (!window.confirm(`Delete ${studentName} from the directory?`)) {
            return;
        }

        const btn = form.querySelector("button[type='submit']");
        btn.disabled = true;
        btn.textContent = "Deleting...";

        try {
            const response = await fetch(form.action, {
                method: "DELETE",
                headers: {
                    Accept: "application/json",
                },
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                showToast(result.message || "Could not delete student.", "error");
                btn.disabled = false;
                btn.textContent = "Delete";
                return;
            }

            const row = form.closest("tr");
            if (row) {
                row.remove();
            }

            updateCourseFilterOptions();
            applyFilters();
            showToast(result.message || "Student record deleted.", "success");
        } catch (error) {
            showToast("Network error while deleting student.", "error");
            btn.disabled = false;
            btn.textContent = "Delete";
        }
    });

    searchInput.addEventListener("input", applyFilters);
    courseFilter.addEventListener("change", applyFilters);

    updateCourseFilterOptions();
    applyFilters();
});

