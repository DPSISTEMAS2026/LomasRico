
export interface ProteinRule {
    std: number;      // Gramaje para proteína estándar (Salmón, Reineta)
    premium: number;  // Gramaje para proteína premium (Camarón, Pulpo)
}

export interface SizeRule {
    totalWeight: number;
    proteinTotal: number;
    baseWeight: number; // Resto de insumos (Leche tigre + Verduras)

    // Distribución Exacta según cantidad de proteínas seleccionadas
    distribution: {
        1: number; // 1 Proteína (Total)
        2: {
            equal: number;      // 50/50
            withPremium: ProteinRule; // Mix con Premium (c/p)
        };
        3: {
            equal: number;      // 33/33/33
            withPremium: ProteinRule; // Mix con Premium (c/p) -> OJO: El rule aquí suele ser 2 Std + 1 Prem
        }
    }
}

export const CEVICHE_RULES: Record<string, SizeRule> = {
    // ------------------------------------------------------------------
    // TABLAS EXACTAS DE GRAMAJES (DOCUMENTOS OPERATIVOS)
    // ------------------------------------------------------------------

    // FORMATO 1 KG
    '1000': {
        totalWeight: 1000,
        proteinTotal: 360,
        baseWeight: 640,
        distribution: {
            1: 360,
            2: {
                equal: 180, // 180/180
                withPremium: { std: 240, premium: 120 } // 240 salmón / 120 camarón
            },
            3: {
                equal: 120, // 120/120/120
                withPremium: { std: 140, premium: 80 } // 140/140/80 (Standard/Standard/Premium)
            }
        }
    },

    // FORMATO 750 G
    '750': {
        totalWeight: 750,
        proteinTotal: 280,
        baseWeight: 470, // 750 - 280
        distribution: {
            1: 280,
            2: {
                equal: 140, // 140/140
                withPremium: { std: 200, premium: 80 } // 200/80
            },
            3: {
                equal: 94, // 94/94/94
                withPremium: { std: 110, premium: 60 } // 110/110/60
            }
        }
    },

    // FORMATO 500 G
    '500': {
        totalWeight: 500,
        proteinTotal: 180,
        baseWeight: 320, // 500 - 180
        distribution: {
            1: 180,
            2: {
                equal: 90, // 90/90
                withPremium: { std: 120, premium: 60 } // 120/60
            },
            3: {
                equal: 60, // 60/60/60
                withPremium: { std: 70, premium: 40 } // 70/70/40
            }
        }
    },

    // FORMATO 350 G (Tomado directo del DOC original)
    '350': {
        totalWeight: 350,
        proteinTotal: 140, // Según el doc, 1 proteina = 140
        baseWeight: 210, // 350 - 140 = 210 (Aunque en veggies suma ~229, asumimos balanceo del Chef con la leche)
        distribution: {
            1: 140,
            2: {
                equal: 70, // 70/70
                withPremium: { std: 100, premium: 40 } // 100/40
            },
            3: {
                equal: 46, // 46/46/46
                withPremium: { std: 56, premium: 30 } // 56/56/30 (c-p)
            }
        }
    },

    // FORMATO 250 G (Escalado proporcionalmente desde 350g)
    '250': {
        totalWeight: 250,
        proteinTotal: 100, // Proporción: 250/350 * 140 ≈ 100
        baseWeight: 150, // 250 - 100
        distribution: {
            1: 100,
            2: {
                equal: 50, // 50/50
                withPremium: { std: 70, premium: 30 } // 70/30
            },
            3: {
                equal: 34, // 34/34/34 ≈ 100
                withPremium: { std: 40, premium: 20 } // 40/40/20
            }
        }
    }
};

