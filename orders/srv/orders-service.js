const cds = require ('@sap/cds')

module.exports = srv => {
    const { 'Orders.Items': OrderItems } = srv.entities

    srv.before ('UPDATE', 'Orders', async function(req) {
      const { ID, Items } = req.data
      if (Items) for (let { product_ID, quantity } of Items) {
        const { quantity:before } = await cds.tx(req).run (
          SELECT.one.from (OrderItems, oi => oi.quantity) .where ({up__ID:ID, product_ID})
        )
        if (quantity != before) await orderChanged (product_ID, quantity-before)
      }
    })

    srv.before ('DELETE', 'Orders', async function(req) {
      const { ID } = req.data
      const Items = await cds.tx(req).run (
        SELECT.from (OrderItems, oi => { oi.product_ID, oi.quantity }) .where ({up__ID:ID})
      )
      if (Items) await Promise.all (Items.map(it => orderChanged (it.product_ID, -it.quantity)))
    })

    srv.before('UPDATE', 'Orders.Items.drafts', async function(req) {
      const { ID, quantity } = req.data
      const item = await cds.tx(req).run (
        SELECT.one.from(OrderItems.drafts, oi => { oi.quantity }).where({ID:ID})
      )
      if (item?.quantity > quantity) 
        req.reject(400, "An item's quantity cannot be lowered")
    })

    srv.before('READ', 'Orders', async function(req) {
      if (req.data.ID) {
        await  cds.tx(req).run(`SELECT 1 / 0 FROM DUMMY`)
      }
    })

    srv.on('error', (err) => {
      const code = err?.code || Number(err?.err?.code);
      if (code === 304) {
        err.code = 422;
        err.message = `Could not divide by 0 ${err.query ? 'in ' + err.query : ''}`;
      }
    });

  /** order changed -> broadcast event */
  function orderChanged (product, deltaQuantity) {
    // Emit events to inform subscribers about changes in orders
    console.log ('> emitting:', 'OrderChanged', { product, deltaQuantity })
    return srv.emit ('OrderChanged', { product, deltaQuantity })
  }
}
