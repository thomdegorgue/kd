// Side-effect imports: registran handlers al cargarse.
//
// Importante: este archivo existe para evitar un ciclo ESM/TDZ:
// `registry.ts` NO debe importar handlers, porque los imports ESM se hoistean y
// terminarían ejecutando handlers antes de inicializar el Map interno del registry.

import './handlers/catalog'
import './handlers/products'
import './handlers/categories'
import './handlers/orders'
import './handlers/dashboard'
import './handlers/customers'
import './handlers/payments'
import './handlers/stock'
import './handlers/shipping'
import './handlers/banners'
import './handlers/variants'
import './handlers/wholesale'
import './handlers/finance'
import './handlers/expenses'
import './handlers/savings'
import './handlers/tasks'
import './handlers/multiuser'
import './handlers/custom-domain'
import './handlers/assistant'

