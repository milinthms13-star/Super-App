// EMI and finance math utilities

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function calculateEmi(principal, annualInterest, tenureMonths) {
  const principalValue = toNumber(principal);
  const annualRate = toNumber(annualInterest);
  const months = Math.max(0, Math.trunc(toNumber(tenureMonths)));

  if (principalValue <= 0 || months <= 0) {
    return 0;
  }

  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) {
    return principalValue / months;
  }

  const ratio = Math.pow(1 + monthlyRate, months);
  return (principalValue * monthlyRate * ratio) / (ratio - 1);
}

export function buildEmiSchedule({
  principal,
  annualInterest,
  tenureMonths,
  prepaymentAmount = 0,
  prepaymentMonth = 0,
} = {}) {
  const principalValue = toNumber(principal);
  const annualRate = toNumber(annualInterest);
  const months = Math.max(0, Math.trunc(toNumber(tenureMonths)));
  const monthlyRate = annualRate / 12 / 100;
  const prepayValue = Math.max(0, toNumber(prepaymentAmount));
  const prepayMonthIndex = Math.max(0, Math.trunc(toNumber(prepaymentMonth)));

  if (principalValue <= 0 || months <= 0) {
    return {
      monthlyEmi: 0,
      totalInterest: 0,
      totalPayable: 0,
      schedule: [],
    };
  }

  const monthlyEmi = calculateEmi(principalValue, annualRate, months);
  let outstanding = principalValue;
  let totalInterest = 0;
  const schedule = [];

  for (let month = 1; month <= months; month += 1) {
    if (outstanding <= 0) {
      break;
    }

    const interest = monthlyRate === 0 ? 0 : outstanding * monthlyRate;
    let principalPart = monthlyEmi - interest;
    if (principalPart > outstanding) {
      principalPart = outstanding;
    }

    let prepayment = 0;
    if (prepayMonthIndex > 0 && prepayMonthIndex === month && prepayValue > 0) {
      prepayment = Math.min(prepayValue, Math.max(0, outstanding - principalPart));
    }

    const closingBalance = Math.max(0, outstanding - principalPart - prepayment);

    totalInterest += interest;
    schedule.push({
      month,
      emi: monthlyEmi,
      interest,
      principal: principalPart,
      prepayment,
      closingBalance,
    });

    outstanding = closingBalance;
  }

  const totalPayable = schedule.reduce((sum, item) => sum + item.emi + item.prepayment, 0);

  return {
    monthlyEmi,
    totalInterest,
    totalPayable,
    schedule,
  };
}

export function exportEmiScheduleCsv(schedule = [], leadName = "loan") {
  const headers = ["Month", "EMI", "Interest", "Principal", "Prepayment", "Closing Balance"];
  const rows = schedule.map((item) => [
    item.month,
    Number(item.emi || 0).toFixed(2),
    Number(item.interest || 0).toFixed(2),
    Number(item.principal || 0).toFixed(2),
    Number(item.prepayment || 0).toFixed(2),
    Number(item.closingBalance || 0).toFixed(2),
  ]);

  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.setAttribute("download", `${leadName}-emi-schedule.csv`);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(url);
}
