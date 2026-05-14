import React, { useMemo, useState } from "react";

const RECORD_CATEGORIES = ["Prescription", "Lab Report", "Scan Report", "Discharge Summary", "Insurance"];

const formatDate = (value) => {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getFamilyLabel = (member) => {
  if (!member) {
    return "Self";
  }
  if (typeof member === "string") {
    return member;
  }
  return member.name || member.relation || "Family";
};

const getFamilyOptionValue = (member) => {
  if (!member) {
    return "Self";
  }
  if (typeof member === "string") {
    return member;
  }
  return member.name || member.relation || "Family";
};

const RecordsVault = ({
  records,
  familyMembers,
  loading,
  onCreateRecord,
  onDeleteRecord,
  onDownloadRecord,
  onPreviewRecord,
  auditLog,
}) => {
  const [form, setForm] = useState({
    title: "",
    category: "Prescription",
    doctorName: "",
    familyMember: "Self",
    recordDate: "",
    visibility: "private",
    consentExpiryDate: "",
    consentAccepted: false,
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const sortedRecords = useMemo(() => {
    const normalizedQuery = searchText.trim().toLowerCase();
    const filtered = (records || []).filter((record) => {
      const categoryMatch = categoryFilter === "all" || record.category === categoryFilter;
      if (!categoryMatch) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return (
        String(record.title || "").toLowerCase().includes(normalizedQuery) ||
        String(record.fileName || "").toLowerCase().includes(normalizedQuery) ||
        String(record.doctorName || "").toLowerCase().includes(normalizedQuery) ||
        String(record.familyMember || "").toLowerCase().includes(normalizedQuery)
      );
    });

    return filtered.sort((a, b) => (b.recordDate || "").localeCompare(a.recordDate || ""));
  }, [records, searchText, categoryFilter]);

  const updateField = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const resetForm = () => {
    setForm({
      title: "",
      category: "Prescription",
      doctorName: "",
      familyMember: "Self",
      recordDate: "",
      visibility: "private",
      consentExpiryDate: "",
      consentAccepted: false,
    });
    setSelectedFile(null);
  };

  const submitRecord = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setFeedbackMessage("Please select a document or image.");
      return;
    }

    if (!form.title || !form.doctorName || !form.recordDate) {
      setFeedbackMessage("Please complete title, doctor name, and record date.");
      return;
    }
    if (!form.consentAccepted) {
      setFeedbackMessage("Please accept consent before uploading medical data.");
      return;
    }

    setSubmitting(true);

    try {
      await onCreateRecord({
        meta: {
          ...form,
          consentGrantedAt: new Date().toISOString(),
        },
        file: selectedFile,
      });

      setFeedbackMessage("Record uploaded to vault.");
      resetForm();
    } catch (error) {
      setFeedbackMessage(error?.message || "Unable to upload the record.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderPreview = (record) => {
    if (!record?.fileUrl) {
      return <span className="healthcare-muted">Preview unavailable</span>;
    }

    if (String(record.fileType || "").startsWith("image/")) {
      return <img src={record.fileUrl} alt={record.fileName} className="healthcare-record-preview-image" />;
    }

    return (
      <button
        type="button"
        className="healthcare-secondary-button"
        onClick={() => onPreviewRecord?.(record)}
      >
        Preview File
      </button>
    );
  };

  return (
    <section className="healthcare-section">
      <div className="healthcare-section-heading">
        <h2>Health Records Vault</h2>
        <p>Upload, preview, categorize, delete, and securely download records by patient and doctor.</p>
      </div>

      {feedbackMessage ? (
        <div className="healthcare-inline-alert" role="status">
          {feedbackMessage}
        </div>
      ) : null}

      <div className="healthcare-records-grid">
        <form className="healthcare-record-card" onSubmit={submitRecord}>
          <h3>Upload Record</h3>

          <label className="healthcare-field">
            <span>Document Title</span>
            <input type="text" value={form.title} onChange={(event) => updateField("title", event.target.value)} required />
          </label>

          <label className="healthcare-field">
            <span>Category</span>
            <select value={form.category} onChange={(event) => updateField("category", event.target.value)}>
              {RECORD_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="healthcare-field">
            <span>Doctor Name</span>
            <input
              type="text"
              value={form.doctorName}
              onChange={(event) => updateField("doctorName", event.target.value)}
              required
            />
          </label>

          <label className="healthcare-field">
            <span>Record Date</span>
            <input
              type="date"
              value={form.recordDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(event) => updateField("recordDate", event.target.value)}
              required
            />
          </label>

          <label className="healthcare-field">
            <span>Family Member</span>
            <select value={form.familyMember} onChange={(event) => updateField("familyMember", event.target.value)}>
              {(familyMembers || []).map((member) => (
                <option key={getFamilyOptionValue(member)} value={getFamilyOptionValue(member)}>
                  {getFamilyLabel(member)}
                </option>
              ))}
            </select>
          </label>

          <label className="healthcare-field">
            <span>Upload file</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              required
            />
          </label>

          <label className="healthcare-field">
            <span>Sharing Permission</span>
            <select value={form.visibility} onChange={(event) => updateField("visibility", event.target.value)}>
              <option value="private">Only me</option>
              <option value="family">Family viewers</option>
              <option value="care-team">Family and care team</option>
            </select>
          </label>

          <label className="healthcare-field">
            <span>Consent Expiry</span>
            <input
              type="date"
              value={form.consentExpiryDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(event) => updateField("consentExpiryDate", event.target.value)}
            />
          </label>

          <label className="healthcare-checkbox healthcare-field-full">
            <input
              type="checkbox"
              checked={form.consentAccepted}
              onChange={(event) => updateField("consentAccepted", event.target.checked)}
            />
            <span>I consent to storing this medical document in the healthcare vault.</span>
          </label>

          <button type="submit" className="healthcare-primary-button" disabled={submitting}>
            {submitting ? "Uploading..." : "Upload To Vault"}
          </button>
        </form>

        <div className="healthcare-record-list-card">
          <h3>Stored Records</h3>
          <div className="healthcare-filter-row">
            <label className="healthcare-field">
              <span>Search</span>
              <input
                type="text"
                placeholder="Search title, doctor, file, family member"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </label>
            <label className="healthcare-field">
              <span>Category</span>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="all">All categories</option>
                {RECORD_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? <p>Loading records...</p> : null}
          {!loading && sortedRecords.length === 0 ? <p>No records yet.</p> : null}

          {sortedRecords.map((record) => (
            <article key={record.id} className="healthcare-record-item">
              <div className="healthcare-record-meta">
                <strong>{record.title || record.fileName}</strong>
                <span>
                  {record.category} | {formatDate(record.recordDate)} | {record.familyMember}
                </span>
                <span>Doctor: {record.doctorName || "Not specified"}</span>
                <span>File: {record.fileName}</span>
                <span>Version: v{record.version || 1}</span>
                <span>Visibility: {record.visibility || "private"}</span>
              </div>

              <div className="healthcare-record-actions">
                {renderPreview(record)}
                <button
                  type="button"
                  className="healthcare-secondary-button"
                  onClick={() => onDownloadRecord?.(record)}
                >
                  Secure Download
                </button>
                <button
                  type="button"
                  className="healthcare-danger-button"
                  onClick={() => {
                    const confirmed = window.confirm("Archive this record? It will be removed from active list.");
                    if (confirmed) {
                      void onDeleteRecord(record.id);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="healthcare-record-list-card">
        <h3>Audit Trail</h3>
        {(auditLog || []).length === 0 ? <p>No record events captured yet.</p> : null}
        {(auditLog || []).slice(0, 10).map((entry) => (
          <article key={entry.id} className="healthcare-record-item">
            <div className="healthcare-record-meta">
              <strong>{entry.recordTitle}</strong>
              <span>{entry.eventType.replaceAll("_", " ")}</span>
              <span>{entry.details}</span>
              <span>
                {entry.actor} | {formatDate(entry.createdAt)}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default RecordsVault;
