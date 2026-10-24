import test from "node:test";import assert from "node:assert/strict";
const shipping=n=>n>=75?0:6.99;const money=n=>Math.round(n*100)/100;
test("currency rounding",()=>assert.equal(money(10.1+0.2),10.3));
test("free shipping threshold",()=>{assert.equal(shipping(75),0);assert.equal(shipping(74.99),6.99);});
