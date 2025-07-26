// js/cars/carFactory.js
import { BasicSportsCar } from './basicSportsCar.js';
import { MuscleCar } from './muscleCar.js';
import { FormulaCar } from './formulaCar.js';

// Central repository for all car definitions
export const CARS = {
    basicSportsCar: new BasicSportsCar(),
    muscleCar: new MuscleCar(),
    formulaCar: new FormulaCar(),
};

// Function to get a car instance by ID
export function getCarById(id) {
    return CARS[id] || null;
}