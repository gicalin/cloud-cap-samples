const cds = require ('@sap/cds')
class OrdersService extends cds.ApplicationService {

  /** register custom handlers */
  init(){
    const { 'Orders.Items':OrderItems } = this.entities

    this.before ('UPDATE', 'Orders', async function(req) {
      const { ID, Items } = req.data
      if (Items) for (let { product_ID, quantity } of Items) {
        const { quantity:before } = await cds.tx(req).run (
          SELECT.one.from (OrderItems, oi => oi.quantity) .where ({up__ID:ID, product_ID})
        )
        if (quantity != before) await this.orderChanged (product_ID, quantity-before)
      }
    })

    this.before ('DELETE', 'Orders', async function(req) {
      if (!['7e2f2640-6866-4dcf-8f4d-3027aa831cad','64e718c9-ff99-47f1-8ca3-950c850777d4'].includes(req.data.ID)) {
        req.error (422, 'Cannot delete order ' + req.data.ID);
        req.error (422, 'Please re-check order ' + req.data.ID);
        return;
      }
      const { ID } = req.data
      const Items = await cds.tx(req).run (
        SELECT.from (OrderItems, oi => { oi.product_ID, oi.quantity }) .where ({up__ID:ID})
      )
      if (Items) await Promise.all (Items.map(it => this.orderChanged (it.product_ID, -it.quantity)))
    })

    // could there be an .after('$batch', 'Orders'.. where errors of the batch-contained requests are accessible?
    // this.after('DELETE', 'Orders', async function(_results, req) {
    //   if (!['7e2f2640-6866-4dcf-8f4d-3027aa831cad','64e718c9-ff99-47f1-8ca3-950c850777d4'].includes(req.data.ID)) {
    //     req.reject();
    //   }
    // })

    return super.init()
  }

  /** order changed -> broadcast event */
  orderChanged (product, deltaQuantity) {
    // Emit events to inform subscribers about changes in orders
    console.log ('> emitting:', 'OrderChanged', { product, deltaQuantity })
    return this.emit ('OrderChanged', { product, deltaQuantity })
  }

}
module.exports = OrdersService
