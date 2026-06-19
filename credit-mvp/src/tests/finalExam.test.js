import {
    generateSchedule,
    generateSimpleSchedule,
    validatePlanInputs
} from "../services/paymentPlanService";

describe("finalExam.test.js", () => {
    test("validatePlanInputs_TermLessThan12Months_ThrowsError", () => {
        //Arrange
        const amount = 10000;
        const termMonths = 6;
        const annualRate = 0.12;

        //Act & Assert
        expect(() => {
            validatePlanInputs(amount, termMonths, annualRate);
        }).toThrow("El plazo debe ser por lo menos 12 meses");
    });

    test("validatePlanInputs_AnnualrateGreaterThan36_ThrowsError", () => {
        //Arrange
        const amount = 10000;
        const termMonths = 12;
        const annualRate = 0.37;

        //Act & Assert
        expect(() => {
            validatePlanInputs(amount, termMonths, annualRate);
        }).toThrow("La tasa de interes anual debe ser mayor a 0% y menor a 36%");
    });

    test("validateClientExists_NonExistingClient_ThrowsError", () => {
        //Arrange
        const clientDNI = 1111111;

        const clients = 
        [
            {dni: "123"},
            {dni: "456"}
        ];

        //Act & Assert
        expect(() => {
            validateClientExists(clientDNI, clients);
        }).toThrow("El cliente no existe");
    });
});