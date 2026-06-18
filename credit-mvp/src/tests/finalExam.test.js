

describe("finalExam.test.js", () => {
    
    test("validatePlanInputs_TermLessThan12Months_ThrowsError", () => {
        //Arrange
        const amount = 10000;
        const termMonths = 6;
        const annualRate = 0.12;

        //Act & Assert
        expect(() => {
            validatePlanInputs(amount, termMonths, annualRate)
        }).toThrow("El plazo debe ser por lo menos 12 meses");
    });

});