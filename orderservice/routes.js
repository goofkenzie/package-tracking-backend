const express = require("express")
const db = require("./db")
const checktoken = require("./auth")

const router = express.Router()



/* get my orders */
router.get("/", checktoken, async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ message: "only users can view their orders" })
    }

    const result = await db.query(
      "select * from orders where userid = $1",
      [req.user.id]
    )

    res.json(result.rows)

  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "server error" })
  }
})



// create order
router.post("/", checktoken, async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ message: "only users can create orders" })
    }

    const { pickup, dropoff, details, deliverytime } = req.body ;

    if (!pickup || !dropoff || !details || !deliverytime) {
       return res.status(400).json({ message: "all fields are required" })
    }

    if (new Date(deliverytime) < new Date()) {
      return res.status(400).json({ message: "delivery time must be in the future" })
    }

    const result = await db.query(
      "insert into orders (userid, pickup, dropoff, details, deliverytime, status) values ($1, $2, $3, $4, $5, 'Pending') returning *",
      [req.user.id, pickup, dropoff, details, deliverytime]
    )

    res.status(201).json({ message: "order created", order: result.rows[0] }) ;

  } catch (err) {
     console.log(err)
     res.status(500).json({ message: "server error" })
  }
})


router.get("/:id", checktoken, async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ message: "only users can view their orders" })
    }

    const orderid = Number(req.params.id)
    if (!Number.isInteger(orderid)) {
      return res.status(400).json({ message: "order id is not valid" })
    }

    // the order must belong to the logged in user
    const result = await db.query(
      "select * from orders where id = $1 and userid = $2",
      [orderid, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "order not found" })
    }

    const order = result.rows[0]
    order.courier = null

    // if a courier is assigned, add his name and phone
    // (change courierid if your column has another name)
    if (order.courierid) {
      try {
        const courier = await db.query(
          "select name, phone from users where id = $1",
          [order.courierid]
        )
        order.courier = courier.rows[0] || null
      } catch (err) {
        console.log("could not get courier:", err.message)
      }
    }

    res.json(order)

  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "server error" })
  }
})

module.exports = router
