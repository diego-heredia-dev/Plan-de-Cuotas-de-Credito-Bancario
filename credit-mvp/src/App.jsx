import { useState } from "react";
import { supabase } from "./supabaseClient";
import { useEffect } from "react";
import "./App.css";

let planIdCounter = 1;

//App() is called each time there is rerendered
function App() {
  const [clients, setClients] = useState([]);
  
  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    fetchClients();
    fetchPlans();
  }, []);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*");

    if (error) {
      console.log(error);
      return;
    }

    setClients(data);
  };

  const fetchPlans = async () => {
    const { data: plansData, error } = await supabase
      .from("plans")
      .select("*");

    if (error) {
      console.log(error);
      return;
    }

    const { data: installmentsData } = await supabase
      .from("installments")
      .select("*");

    const plansWithSchedule = plansData.map((plan) => ({
      id: plan.id,
      clientDni: plan.client_dni,
      amount: Number(plan.amount),
      termMonths: plan.term_months,
      installmentValue: Number(plan.installment_value),
      totalToPay: Number(plan.total_to_pay),
      interestType: plan.interest_type,
      status: plan.status,
      schedule: installmentsData
        .filter((inst) => inst.plan_id === plan.id)
        .map((inst) => ({
          number: inst.number,
          installmentValue: Number(inst.installment_value),
          interest: Number(inst.interest),
          capital: Number(inst.capital),
          remainingBalance: Number(inst.remaining_balance),
          dueDate: inst.due_date,
          status: inst.status
        }))
    }));

    setPlans(plansWithSchedule);
  };

  const boliviaDepartments = [
    "La Paz",
    "Santa Cruz",
    "Cochabamba",
    "Oruro",
    "Potosí",
    "Chuquisaca",
    "Tarija",
    "Beni",
    "Pando"
  ];

  const [newClient, setNewClient] = useState({
    name: "",
    lastName: "",
    birthDate: "",
    phoneNumber: "",
    email: "",
    dni: "",
    department: ""
  });

  const [plans, setPlans] = useState([]);

  const [newPlan, setNewPlan] = useState({
    clientDni: "",
    amount: "",
    termMonths: "",
    interestRate: "",
    interestType: "frances" //default
  });

  const handlePlanChange = (e) => {
    const {name, value} = e.target;

    setNewPlan({
      ...newPlan,
      [name]: value
    });
  };

  const generateSchedule = (amount, termMonths, annualRate) => {
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

  const createPlan = async () => {
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

    // 1️⃣ Insertar plan
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

    // 2️⃣ Insertar cuotas
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

    await fetchPlans(); // lo crearemos ahora
  };

  const generateSimpleSchedule = (amount, termMonths, annualRate) => {
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


  const createClient = async () => {
    if (
      !newClient.name ||
      !newClient.lastName ||
      !newClient.birthDate ||
      !newClient.phoneNumber ||
      !newClient.email ||
      !newClient.dni ||
      !newClient.department
    ) {
      alert("Todos los campos deben ser llenados");
      return;
    }

    const { data, error } = await supabase
      .from("clients")
      .insert([
        {
          dni: newClient.dni,
          name: newClient.name,
          last_name: newClient.lastName,
          birth_date: newClient.birthDate,
          phone: newClient.phoneNumber,
          email: newClient.email,
          department: newClient.department
        }
      ]);

    if (error) {
      console.log("ERROR COMPLETO:", error);
      alert(error.message);
      return;
    }

    alert("Cliente guardado en Supabase");
    await fetchClients();

    setNewClient({
      name: "",
      lastName: "",
      birthDate: "",
      phoneNumber: "",
      email: "",
      dni: "",
      department: ""
    });
  };

  const markInstallmentAsPaid = (planId, installmentNumber) => {
    const updatedPlans = plans.map((plan) => {
      if (plan.id !== planId) return plan;

      const updatedSchedule = plan.schedule.map((installment) => {
        if (installment.number !== installmentNumber) return installment;

        return {
          ...installment,
          status: "paid"
        };
      });

      const allPaid = updatedSchedule.every(
        (installment) => installment.status === "paid"
      );

      return {
        ...plan,
        schedule: updatedSchedule,
        status: allPaid ? "completed" : plan.status
      };
    });

    setPlans(updatedPlans);
  };


  const approvePlan = (planId) => {
    const planToApprove = plans.find((plan) => plan.id === planId);

    if (!planToApprove) return;

    const updatedPlans = plans
      .filter(
        (plan) =>
          plan.clientDni !== planToApprove.clientDni ||
          plan.id === planId
      )
      .map((plan) =>
        plan.id === planId
          ? { ...plan, status: "approved" }
          : plan
      );

    setPlans(updatedPlans);
  };


  const handleClientChange = (e) => {
    //e is the event and target is basically all the input html, for example:
    //<input name="email" value="hello@world.com" type="text" />
    //Then we can access its internal properties
    
    const {name, value} = e.target;

    setNewClient({
      ...newClient,
      [name]: value
    });
  };

  return (
    <div className="container">
      <h1>Credit Plan MVP</h1>

      <h2>Crear Cliente</h2>

      <input
        type="text"
        name="name"
        placeholder="Nombre"
        value={newClient.name}
        onChange={handleClientChange}
      />

      <input
        type="text"
        name="lastName"
        placeholder="Apellido"
        value={newClient.lastName}
        onChange={handleClientChange}
      />

      <input
        type="date"
        name="birthDate"
        value={newClient.birthDate}
        onChange={handleClientChange}
      />

      <input
        type="text"
        name="phoneNumber"
        placeholder="Teléfono"
        value={newClient.phoneNumber}
        onChange={handleClientChange}
      />

      <input
        type="email"
        name="email"
        placeholder="Correo electrónico"
        value={newClient.email}
        onChange={handleClientChange}
      />

      <input
        type="text"
        name="dni"
        placeholder="DNI"
        value={newClient.dni}
        onChange={handleClientChange}
      />

      <select
        name="department"
        value={newClient.department}
        onChange={handleClientChange}
      >
        <option value="">Seleccionar departamento</option>
        {boliviaDepartments.map((dep) => (
          <option key={dep} value={dep}>
            {dep}
          </option>
        ))}
      </select>
      
      <button onClick={createClient}>
        Guardar Cliente
      </button>

      <h3>Clientes Registrados</h3>

      <ul>
        {clients.map((client) => (
          <li key={client.dni}>
            {client.name} {client.lastName} - DNI: {client.dni} - {client.department}
          </li>
        ))}
      </ul>
      
      <h2>Crear Plan de Cuotas</h2>

      <input
        type="text"
        name="clientDni"
        placeholder="DNI del cliente"
        value={newPlan.clientDni}
        onChange={handlePlanChange}
      />

      <input
        type="number"
        name="amount"
        placeholder="Monto del crédito"
        value={newPlan.amount}
        onChange={handlePlanChange}
      />

      <input
        type="number"
        name="termMonths"
        placeholder="Plazo en meses"
        value={newPlan.termMonths}
        onChange={handlePlanChange}
      />

      <input
        type="number"
        name="interestRate"
        placeholder="Tasa anual (%)"
        value={newPlan.interestRate}
        onChange={handlePlanChange}
      />

      <select
        name="interestType"
        value={newPlan.interestType}
        onChange={handlePlanChange}
      >
        <option value="frances">Interés compuesto (Francés)</option>
        <option value="simple">Interés simple</option>
      </select>


      <button onClick={createPlan}>
        Crear Plan
      </button>

      <h3>Planes Registrados</h3>

      {plans.map((plan) => (
        <div key={plan.id} className="card">
          <p>
            Plan #{plan.id} - Cliente DNI: {plan.clientDni}
          </p>
          <p>Monto: {plan.amount}</p>
          <p>Total a pagar: {plan.totalToPay.toFixed(2)}</p>
          <p>Cuota mensual: {plan.installmentValue.toFixed(2)}</p>
          <p>Tipo de plan: {plan.interestType}</p>
          <p className={`plan-status ${plan.status}`}>
            Estado del plan: {plan.status}
          </p>
          {plan.status === "draft" && (
            <button onClick={() => approvePlan(plan.id)}>
              Aprobar Plan
            </button>
          )}


          <h4>Cronograma</h4>
          <ul>
            {plan.schedule.map((installment) => (
              <li key={installment.number}>
                Cuota {installment.number} - 
                {installment.installmentValue.toFixed(2)} - 
                Interés: {installment.interest.toFixed(2)} - 
                Capital: {installment.capital.toFixed(2)} - 
                Saldo: {installment.remainingBalance.toFixed(2)} - 
                Vence: {installment.dueDate} - 
                Estado: {installment.status}

                {plan.status === "approved" && installment.status === "pending" && (
                  <button
                    onClick={() =>
                      markInstallmentAsPaid(plan.id, installment.number)
                    }
                  >
                    Pagar
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}


    </div>
  );
}

export default App;
