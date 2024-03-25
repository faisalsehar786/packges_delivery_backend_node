const axios = require('axios')
const moment = require('moment')
const Sentry = require('@sentry/node')

async function createCustomer(organisation) {
  try {
    const config = {
      method: 'post',
      url: `${process.env.TRIPLE_TAX_BASE_URL}/customer`,
      headers: {
        Authorization: `Basic ${process.env.TRIPLE_TAX_AUTHORIZATION_CODE}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: organisation.org_name, // org name
        supplierNumber: 0,
        customerNumber: organisation.org_id,
        organizationNumber: organisation.organisation_number,
        isSupplier: false,
        isCustomer: true,
        isInactive: false,
        email: organisation.email, // this is org user email
        invoiceEmail: organisation.email, // this is org user email
        overdueNoticeEmail: organisation.email, // this is user email
        phoneNumber: organisation.mobile_phone, // NIF mobile_number
        phoneNumberMobile: organisation.phone_no, // MSN Modal phone_no
        description: 'HYhm Organisation',
        language: 'NO',
        displayName: organisation.org_name,
        isPrivateIndividual: false,
        singleCustomerInvoice: false,
        invoiceSendMethod: 'EMAIL', // we might change that to EHF @saif
        emailAttachmentType: 'LINK',
        postalAddress: {
          id: 0,
          addressLine1: organisation.address_line1,
          // addressLine2: organisation.address_line2,
          postalCode: organisation.post_code,
          city: organisation.city,
          country: {
            id: 161,
          },
        },
        physicalAddress: {
          id: 0,
          addressLine1: organisation.address_line1,
          // addressLine2: organisation.address_line2,
          postalCode: organisation.post_code,
          city: organisation.city,
          country: {
            id: 161,
          },
        },
        deliveryAddress: {
          id: 0,
          addressLine1: organisation.address_line1,
          // addressLine2: organisation.address_line2,
          postalCode: organisation.post_code,
          city: organisation.city,
          country: {
            id: 161,
          },
        },
        invoicesDueIn: 14,
        invoicesDueInType: 'DAYS',
        currency: {
          id: 1,
        },
      },
    }
    const userInfoPayload = await axios(config)
    return userInfoPayload?.data
  } catch (error) {
    Sentry.captureException(error)
  }
}

async function createOrder(organisation, amount, vatamt) {
  try {
    const uuid = moment().format('DDMMYYHHMM')
    const config = {
      method: 'post',
      url: `${process.env.TRIPLE_TAX_BASE_URL}/order`,
      headers: {
        Authorization: `Basic ${process.env.TRIPLE_TAX_AUTHORIZATION_CODE}`,
        'Content-Type': 'application/json',
      },
      data: {
        customer: {
          id: organisation.triple_tax_id,
        },
        deliveryDate: moment().add(14, 'days').format('YYYY-MM-DD'),
        orderDate: moment().format('YYYY-MM-DD'),
        receiverEmail: organisation.email,
        overdueNoticeEmail: organisation.email,
        number: uuid,
        reference: uuid,
        invoiceComment: `Total HYHM mottatt forrige måned: NOK ${amount}`,
        currency: {
          id: 1,
        },
        invoicesDueIn: 14,
        invoicesDueInType: 'DAYS',
        isShowOpenPostsOnInvoices: false,
        isClosed: false,
        deliveryAddress: {
          id: 0,
          addressLine1: organisation.address_line1,
          // addressLine2: organisation.address_line2,
          postalCode: organisation.post_code,
          city: organisation.city,
          country: {
            id: 161,
          },
        },
        deliveryComment: 'Delivery comments',
        isPrioritizeAmountsIncludingVat: true,
        orderLineSorting: 'PRODUCT',
        orderLines: [
          {
            id: 0,
            version: 0,
            product: {
              id: 55656755,
            },
            count: 1,
            currency: {
              id: 1,
            },
            markup: 0,
            discount: 0,
            amountIncludingVatCurrency: vatamt,
            unitPriceIncludingVatCurrency: vatamt,
            isSubscription: false,
          },
        ],
        isSubscription: false,
        sendMethodDescription: 'EMAIL',
        invoiceOnAccountVatHigh: false,
      },
    }
    const userInfoPayload = await axios(config)
    return userInfoPayload?.data
  } catch (error) {
    Sentry.captureException(error)
  }
}

async function createInvoice(order_id, triple_tax_id, paidAmount) {
  try {
    const config = {
      method: 'post',
      url: `${process.env.TRIPLE_TAX_BASE_URL}/invoice?sendToCustomer=true&paidAmount=${paidAmount}`,
      headers: {
        Authorization: `Basic ${process.env.TRIPLE_TAX_AUTHORIZATION_CODE}`,
        'Content-Type': 'application/json',
      },
      data: {
        invoiceDate: moment().format('YYYY-MM-DD'), // This must be todays date
        invoiceDueDate: moment().add(14, 'days').format('YYYY-MM-DD'), // This must be 14 days from the creation of the date.
        orders: [
          {
            id: order_id, // This is the order ID
          },
        ],
        customer: {
          id: triple_tax_id,
        },
        // comment: `Total HYhm mottatt: ${totalAmount} - Total platform kost (12%): ${paidAmount} - Netto HYhm utbetalt: ${netAmount}`,
        comment: ``,
        currency: {
          id: 1,
        },
        invoiceRemarks: 'invoice remarks',
      },
    }
    const userInfoPayload = await axios(config)
    return userInfoPayload?.data
  } catch (error) {
    Sentry.captureException(error)
  }
}

module.exports = {
  createCustomer,
  createOrder,
  createInvoice,
}
