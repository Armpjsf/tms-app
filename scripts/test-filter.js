const customers = [
  {
    Customer_ID: "2",
    Customer_Name: "บมจ.ยูนิคอร์ด",
    Default_Origin: "นิคมอุตสาหกรรม ",
    Contact_Person: "คุณแจ๊คซั่ม",
    Phone: "02-999-9999",
    Address: null,
    Tax_ID: null,
    Branch_ID: "นวนคร",
    lat: null,
    lon: null,
    GoogleMap_Link: null,
    Expire_Date: null,
  },
  {
    Customer_ID: "47",
    Customer_Name: "ทมแพล",
    Default_Origin: "นิคมอุตสาหกรรม ",
    Contact_Person: "คุณแจ๊คซั่ม",
    Phone: "02-999-9999",
    Address: null,
    Tax_ID: null,
    Branch_ID: "นวนคร",
    lat: null,
    lon: null,
    GoogleMap_Link: null,
    Expire_Date: null,
  },
];

const query = "";

const filteredCustomers =
  query === ""
    ? customers
    : customers.filter((customer) =>
        customer.Customer_Name.toLowerCase().includes(query.toLowerCase()),
      );

console.log("Filtered count:", filteredCustomers.length);
console.log("First item:", filteredCustomers[0]);
