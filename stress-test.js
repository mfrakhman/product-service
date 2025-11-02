import http from "k6/http";
import { check } from "k6";

export const options = {
  scenarios: {
    create_orders: {
      executor: "constant-arrival-rate",
      rate: 1000,
      timeUnit: "1s",
      duration: "60s",
      preAllocatedVUs: 200,
      maxVUs: 500,
    },
  },
};

const BASE_URL = "http://localhost:3002/orders";
const PRODUCT_ID = __ENV.PRODUCT_ID || "8f1ec8a2-67dc-436b-abcc-d77b8c8fa0ed"; // <- Change it to your "ProductId"

export default function () {
  const payload = JSON.stringify({
    productId: PRODUCT_ID,
    quantity: 1,
  });

  const params = { headers: { "Content-Type": "application/json" } };

  const res = http.post(BASE_URL, payload, params);

  check(res, {
    "status is 201": r => r.status === 201,
  });
}
