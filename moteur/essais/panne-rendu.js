// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// Chargé par `node --require` dans les essais de la ligne de commande : remplace
// rendre() par une fonction qui lève une TypeError, pour simuler une exception
// imprévue du moteur sans rien ajouter au code de production.
require("../rendu.js").rendre = () => { throw new TypeError("panne simulée du rendu"); };
