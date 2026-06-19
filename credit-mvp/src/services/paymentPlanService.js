const MAX_ANNUAL_RATE = 0.36;

export const generateSchedule = (amount, termMonths, annualRate) => {
  validatePlanInputs(amount, termMonths, annualRate);
  
  const monthlyRate = annualRate / 12;
  const installmentValue =
    amount *
    (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
    (Math.pow(1 + monthlyRate, termMonths) - 1);

  let remainingBalance = amount;

  const schedule = [];

  for (let i = 1; i <= termMonths; i++) {
    const interestPortion = remainingBalance * monthlyRate;
    const capitalPortion = installmentValue - interestPortion;

    remainingBalance -= capitalPortion;

    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + i);

    schedule.push({
      number: i,
      installmentValue,
      interest: interestPortion,
      capital: capitalPortion,
      remainingBalance: remainingBalance < 0 ? 0 : remainingBalance,
      dueDate: dueDate.toISOString().split("T")[0],
      status: "pending"
    });
  }

  const totalToPay = installmentValue * termMonths;
    
  return {
    totalToPay,
    installmentValue,
    schedule
  };
};

export const validatePlanInputs = (amount, termMonths, annualRate) => {
  if (termMonths < 12) {
    throw new Error("El plazo debe ser por lo menos 12 meses");
  }

  if (amount <= 0) {
    throw new Error("La cantidad debe ser mayor a 0");
  }

  if (annualRate <= 0) {
    throw new Error("La tasa de interes anual debe ser mayor a 0");
  }

  if (annualRate >= MAX_ANNUAL_RATE) {
    throw new Error("La tasa de interes anual debe ser mayor a 0% y menor a 36%");
  }
};

export const generateSimpleSchedule = (amount, termMonths, annualRate) => {
  if (termMonths <= 0) {
    throw new Error("Invalid term months");
  }

  const totalInterest = amount * annualRate;
  const totalToPay = amount + totalInterest;
  const installmentValue = totalToPay / termMonths;

  const schedule = [];

  for (let i = 1; i <= termMonths; i++) {
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + i);

    schedule.push({
      number: i,
      installmentValue,
      interest: totalInterest / termMonths,
      capital: amount / termMonths,
      remainingBalance: amount - (amount / termMonths) * i,
      dueDate: dueDate.toISOString().split("T")[0],
      status: "pending"
    });
  }

  return {
    totalToPay,
    installmentValue,
    schedule
  };
};

export const createPlan = async () => {
  if (
    !newPlan.clientDni ||
    !newPlan.amount ||
    !newPlan.termMonths ||
    !newPlan.interestRate
  ) {
    alert("Todos los campos del plan son obligatorios");
    return;
  }

  if (Number(newPlan.termMonths) < 12) {
    alert("El plazo debe ser mayor o igual a 12 meses");
    return;
  }

  const annualRate = Number(newPlan.interestRate) / 100;

  if (annualRate <= 0 || annualRate >= 0.36) {
    alert("La tasa debe ser mayor a 0% y menor a 36%");
    return;
  }

  const amount = Number(newPlan.amount);
  const termMonths = Number(newPlan.termMonths);

  const result =
    newPlan.interestType === "simple"
      ? generateSimpleSchedule(amount, termMonths, annualRate)
      : generateSchedule(amount, termMonths, annualRate);

  const { totalToPay, installmentValue, schedule } = result;

  const { data: planData, error: planError } = await supabase
    .from("plans")
    .insert([
      {
        client_dni: newPlan.clientDni,
        amount,
        term_months: termMonths,
        interest_rate: annualRate,
        interest_type: newPlan.interestType,
        total_to_pay: totalToPay,
        installment_value: installmentValue,
        status: "draft"
      }
    ])
    .select();

  if (planError) {
    console.log(planError);
    alert(planError.message);
    return;
  }

  const createdPlan = planData[0];

  const installmentsToInsert = schedule.map((inst) => ({
    plan_id: createdPlan.id,
    number: inst.number,
    installment_value: inst.installmentValue,
    interest: inst.interest,
    capital: inst.capital,
    remaining_balance: inst.remainingBalance,
    due_date: inst.dueDate,
    status: inst.status
  }));

  const { error: installmentError } = await supabase
    .from("installments")
    .insert(installmentsToInsert);

  if (installmentError) {
    console.log(installmentError);
    alert(installmentError.message);
    return;
  }

  alert("Plan guardado en Supabase");

  await fetchPlans(); 
};