import {
    generateSchedule,
    generateSimpleSchedule
} from "../services/paymentPlanService";

describe("finalExam.test.js", () => {
    
    test("generateSchedule_TermLessThan12Months_ThrowsError", () => {
        //Arrange
        const amount = 10000;
        const termMonths = 6;
        const annualRate = 0.12;

        //Act & Assert
        expect(() => {
            generateSchedule(amount, termMonths, annualRate)
        }).toThrow("El plazo debe ser por lo menos 12 meses")
    });

});