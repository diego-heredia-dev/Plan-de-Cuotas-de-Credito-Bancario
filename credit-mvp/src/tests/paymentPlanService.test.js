import {
    generateSchedule,
    generateSimpleSchedule
} from "../services/paymentPlanService";

//
describe("paymentPlanService.test.js", () => {
    
    test("generateSchedule_ValidTermMonths_12installments", () => {
        //Arrange
        const amount = 12000;
        const termMonths = 12;
        const annualRate = 0.12
        
        //Act
        const result = generateSchedule(amount, termMonths, annualRate);

        //Assert
        expect(result.schedule.length).toBe(12);
    });
    
    test("generateSchedule_InvalidTermMonths_ThrowsError", () => {
        //Arrange
        const amount = 10000;
        const termMonths = 0;
        const annualRate = 0.12;

        //Act & Assert
        expect(() => {
            generateSchedule(amount, termMonths, annualRate);
        }).toThrow("El plazo debe ser mayor a 0");
    })
    
    test("generateSchedule_InvalidAnnualRate_ThrowsError", () => {
        //Arrange
        const amount = 10000;
        const termMonths = 12;
        const annualRate = 0;

        //Act & Arrange
        expect(() => {
            generateSchedule(amount, termMonths, annualRate);
        }).toThrow("La tasa de interes anual debe ser mayor a 0");
    });
    
    test("generateSimpleSchedule_ValidInput_CalculatesTotalToPay", () => {
        //Arrange
        const amount = 1000;
        const termMonths = 10;
        const annualRate = 0.1;

        //Act
        const result = generateSimpleSchedule(amount, termMonths, annualRate);
        
        //Assert
        expect(result.totalToPay).toBe(1100);
    });
});