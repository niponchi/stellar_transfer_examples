const { Operation, TransactionBuilder, Asset, TimeoutInfinite } = require('stellar-sdk')

const printAccount = (account, name = '') => {
  console.log(`${name ? `${name} =>\t` : ''}${account.publicKey()} : ${account.secret()}`)
}

const initAccountWithFriendBot = (server) => async (publicKey) => {
  console.log('calling friendbot')
  return await server.friendbot(publicKey).call()
}

const createAccounts = (server) => async (sourceAccount, startingBalance, ...accounts) => {
  console.log('create accounts')
  let account = await server.loadAccount(sourceAccount.publicKey())

  const txBuilder = new TransactionBuilder(account, { fee: 100 })

  // create accounts
  accounts.forEach(a => txBuilder.addOperation(
    Operation.createAccount({
      destination: a.publicKey(),
      startingBalance: `${startingBalance}`,
    }))
  )

  txBuilder.setTimeout(TimeoutInfinite)

  const transaction = txBuilder.build()
  transaction.sign(sourceAccount)

  return server.submitTransaction(transaction)
}

const createAccountsWithSigner = (server) => async (sourceAccount, startingBalance, ...accounts) => {
  console.log('create accounts and set signer')
  let account = await server.loadAccount(sourceAccount.publicKey())

  const txBuilder = new TransactionBuilder(account, { fee: 100 })

  accounts.forEach(a => {
    txBuilder.addOperation(
      Operation.createAccount({
        destination: a.publicKey(),
        startingBalance: `${startingBalance}`,
      }))

    txBuilder.addOperation(
      Operation.setOptions({
        source: a.publicKey(),
        signer: {
          ed25519PublicKey: sourceAccount.publicKey(),
          weight: 1
        },
      }))
  })

  txBuilder.setTimeout(TimeoutInfinite)

  const transaction = txBuilder.build()
  transaction.sign(sourceAccount, ...accounts)

  return server.submitTransaction(transaction)
}

const transferNative = (server) => async (source, destinationPublic, amount) => {
  return transfer(server)(source, destinationPublic, Asset.native(), amount)
}

const transfer = (server) => async (source, destinationPublic, asset, amount) => {
  console.log('transfer', asset.code)
  let account = await server.loadAccount(source.publicKey())

  let transaction = new TransactionBuilder(account, { fee: 100 })
    .addOperation(
      Operation.payment({
        amount: `${amount}`,
        asset: asset,
        destination: destinationPublic,
      })
    )
    .setTimeout(TimeoutInfinite)
    .build()

  transaction.sign(source)

  return server.submitTransaction(transaction)
}

const showBalance = (server) => async (publicKey) => {
  console.log('show balance')
  let account = await server.loadAccount(publicKey)
  account.balances.forEach(b => console.log(b.asset_code || 'XLM', b.balance))
}

const printError = (err) => {
  if (err.response) {
    if (err.response.extras) {
      err.response.extras.reason && console.log(err.response.extras.reason)
      err.response.extras.transaction && console.log(err.response.extras.transaction)
      err.response.extras.operations && console.log(err.response.extras.operations)
      err.response.extras.result_codes && console.log(err.response.extras.result_codes)
    } else {
      console.error(err.response)
    }
  } else {
    console.error(err)
    console.error(err.stack)
  }
}


module.exports = (server) => ({
  initAccountWithFriendBot: initAccountWithFriendBot(server),
  createAccounts: createAccounts(server),
  createAccountsWithSigner: createAccountsWithSigner(server),
  transferNative: transferNative(server),
  transfer: transfer(server),
  showBalance: showBalance(server),
  printAccount,
  printError,
})

