import React, { useMemo, useState } from "react";
import { Plus, Search, Edit3, Trash2, Save, CreditCard, CalendarDays, Package, IndianRupee, Layers } from "lucide-react";

const MODULES = [
  "Astrology",
  "Bill Pay",
  "Business Builder",
  "Classifieds",
  "Devadarshan",
  "Education",
  "Finance Hub",
  "Food Delivery",
  "Healthcare",
  "Hotel Booking",
  "Hyperlocal Delivery",
  "Job Portal",
  "Local Market",
  "Local Services",
  "Matrimonial",
  "Nila AI Hub",
  "Real Estate",
  "Resume Builder",
  "Skill Learning",
  "Tourism Market",
];

const METHODS = ["Free", "Monthly", "Quarterly", "Half-Yearly", "Yearly", "Lifetime", "Pay Per Use"];
const DURATIONS = ["7 Days", "15 Days", "1 Month", "3 Months", "6 Months", "1 Year", "Lifetime"];
const PLAN_TYPES = ["Free", "Basic", "Standard", "Premium", "Pro", "Enterprise", "Custom"];

const initialFormState = {
  module: MODULES[0],
  planType: "Basic",
  planName: "",
  method: "Monthly",
  amount: "",
  duration: "1 Month",
  status: "Active",
  features: "",
};

export default function AdminModuleSubscriptionScreen() {
  const [plans, setPlans] = useState([
    {
      id: 1,
      module: "Astrology",
      planType: "Basic",
      planName: "Astrology Basic",
      method: "Monthly",
      amount: 199,
      duration: "1 Month",
      status: "Active",
      features: "Daily horoscope, basic zodiac insights, monthly forecast",
    },
    {
      id: 3,
      module: "Astrology",
      planType: "Premium",
      planName: "Astrology Premium",
      method: "Yearly",
      amount: 1499,
      duration: "1 Year",
      status: "Active",
      features: "Birth chart, compatibility, remedies, yearly report, priority support",
    },
    {
      id: 2,
      module: "Resume Builder",
      planType: "Pro",
      planName: "Resume Pro",
      method: "Yearly",
      amount: 999,
      duration: "1 Year",
      status: "Active",
      features: "AI resume, cover letter, templates, PDF export",
    },
  ]);

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialFormState);

  const filteredPlans = useMemo(() => {
    const query = search.toLowerCase();
    return plans.filter(
      (plan) =>
        plan.module.toLowerCase().includes(query) ||
        plan.planName.toLowerCase().includes(query) ||
        plan.method.toLowerCase().includes(query)
    );
  }, [plans, search]);

  const resetForm = () => {
    setEditingId(null);
    setForm(initialFormState);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.planName.trim()) return alert("Please enter plan name");
    if (form.method !== "Free" && form.method !== "Lifetime" && Number(form.amount) < 0) {
      return alert("Please enter a valid amount");
    }

    const payload = {
      ...form,
      amount: form.method === "Free" ? 0 : Number(form.amount || 0),
    };

    if (editingId) {
      setPlans((prev) => prev.map((plan) => (plan.id === editingId ? { ...payload, id: editingId } : plan)));
    } else {
      setPlans((prev) => [{ ...payload, id: Date.now() }, ...prev]);
    }

    resetForm();
  };

  const handleEdit = (plan) => {
    setEditingId(plan.id);
    setForm(plan);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this subscription plan?")) {
      setPlans((prev) => prev.filter((plan) => plan.id !== id));
    }
  };

  const totalRevenue = plans.reduce((sum, plan) => sum + Number(plan.amount || 0), 0);
  const activePlans = plans.filter((plan) => plan.status === "Active").length;
  const modulesWithPlans = new Set(plans.map((plan) => plan.module)).size;

  const groupedPlans = useMemo(() => {
    return filteredPlans.reduce((groups, plan) => {
      if (!groups[plan.module]) groups[plan.module] = [];
      groups[plan.module].push(plan);
      return groups;
    }, {});
  }, [filteredPlans]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Module Subscription Settings</h1>
            <p className="mt-1 text-sm text-slate-500">
              Create and manage subscription plans for every module in your Super App.
            </p>
          </div>
          <button
            onClick={resetForm}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            <Plus size={18} /> New Plan
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Total Plans</p>
              <Package className="text-slate-400" size={22} />
            </div>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">{plans.length}</h2>
            <p className="mt-1 text-xs text-slate-500">Multiple plans allowed per module</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Active Plans</p>
              <CreditCard className="text-slate-400" size={22} />
            </div>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">{activePlans}</h2>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Modules Configured</p>
              <Layers className="text-slate-400" size={22} />
            </div>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">{modulesWithPlans}</h2>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Total Plan Value</p>
              <IndianRupee className="text-slate-400" size={22} />
            </div>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">₹{totalRevenue}</h2>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <form onSubmit={handleSubmit} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:p-6">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900">
              <CalendarDays size={20} /> {editingId ? "Edit Subscription Plan" : "Create Subscription Plan"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Select Module</label>
                <select
                  value={form.module}
                  onChange={(e) => setForm({ ...form, module: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                >
                  {MODULES.map((module) => (
                    <option key={module}>{module}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Plan Type</label>
                  <select
                    value={form.planType}
                    onChange={(e) => setForm({ ...form, planType: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                  >
                    {PLAN_TYPES.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Plan Name</label>
                  <input
                    value={form.planName}
                    onChange={(e) => setForm({ ...form, planName: e.target.value })}
                    placeholder="Example: Premium Plan"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Subscription Method</label>
                  <select
                    value={form.method}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        method: e.target.value,
                        amount: e.target.value === "Free" ? 0 : form.amount,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                  >
                    {METHODS.map((method) => (
                      <option key={method}>{method}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Amount</label>
                  <input
                    type="number"
                    value={form.amount}
                    disabled={form.method === "Free"}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="₹ Amount"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Duration</label>
                  <select
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                  >
                    {DURATIONS.map((duration) => (
                      <option key={duration}>{duration}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                    <option>Coming Soon</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Features Included</label>
                <textarea
                  rows={4}
                  value={form.features}
                  onChange={(e) => setForm({ ...form, features: e.target.value })}
                  placeholder="Example: AI report, unlimited downloads, priority support"
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  <Save size={17} /> {editingId ? "Update Plan" : "Save Plan"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </form>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:p-6">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-bold text-slate-900">Subscription Plans</h2>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search module or plan"
                  className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-900"
                />
              </div>
            </div>

            <div className="space-y-5">
              {Object.entries(groupedPlans).map(([moduleName, modulePlans]) => (
                <div key={moduleName} className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between bg-slate-100 px-4 py-3">
                    <div>
                      <h3 className="font-bold text-slate-900">{moduleName}</h3>
                      <p className="text-xs text-slate-500">{modulePlans.length} plan{modulePlans.length > 1 ? "s" : ""} configured</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setForm({
                          module: moduleName,
                          planType: "Basic",
                          planName: "",
                          method: "Monthly",
                          amount: "",
                          duration: "1 Month",
                          status: "Active",
                          features: "",
                        });
                      }}
                      className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                      + Add Plan
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] text-left text-sm">
                      <thead className="bg-white text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Plan</th>
                          <th className="px-4 py-3">Method</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Duration</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {modulePlans.map((plan) => (
                          <tr key={plan.id} className="hover:bg-slate-50">
                            <td className="px-4 py-4">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                {plan.planType || "Basic"}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <p className="font-medium text-slate-800">{plan.planName}</p>
                              <p className="mt-1 max-w-xs truncate text-xs text-slate-500">{plan.features}</p>
                            </td>
                            <td className="px-4 py-4 text-slate-600">{plan.method}</td>
                            <td className="px-4 py-4 font-semibold text-slate-900">₹{plan.amount}</td>
                            <td className="px-4 py-4 text-slate-600">{plan.duration}</td>
                            <td className="px-4 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  plan.status === "Active"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : plan.status === "Coming Soon"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {plan.status}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleEdit(plan)}
                                  className="rounded-xl border border-slate-300 p-2 text-slate-600 hover:bg-slate-100"
                                  title="Edit"
                                >
                                  <Edit3 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDelete(plan.id)}
                                  className="rounded-xl border border-red-200 p-2 text-red-600 hover:bg-red-50"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {filteredPlans.length === 0 && (
                <div className="rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">No subscription plans found.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
