const fs = require("fs");
const path = require("path");

const PDFDocument = require("pdfkit");

const Product = require("../models/product");
const Order = require("../models/order");

const ITEMS_PER_PAGE = 2;

exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1;

  let totalItems;
  Product.find()
    .countDocuments()
    .then((numProducts) => {
      totalItems = numProducts;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      res.render("shop/index", {
        products: products,
        pageTitle: "Shop",
        path: "/",
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1;

  let totalItems;
  Product.find()
    .countDocuments()
    .then((numProducts) => {
      totalItems = numProducts;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      res.render("shop/product-list", {
        products: products,
        pageTitle: "Shop",
        path: "/products",
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProduct = (req, res, next) => {
  const productId = req.params.productId;

  Product.findById(productId)
    .then((product) => {
      res.render("shop/product-detail", {
        pageTitle: product.title,
        path: "/products",
        product: product,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user.populate("cart.items.productId").then((user) => {
    const products = user.cart.items;
    res.render("shop/cart", {
      pageTitle: "Your Cart",
      path: "/cart",
      products: products,
    });
  });
};

exports.postCart = (req, res, next) => {
  const productId = req.body.productId;

  Product.findById(productId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const productId = req.body.productId;

  req.user
    .removeFromCart(productId)
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckout = (req, res, next) => {
  req.user.populate("cart.items.productId").then((user) => {
    const products = user.cart.items;
    const totalSum = products.reduce((sum, p) => sum + p.quantity * p.productId.price, 0) 
    res.render("shop/checkout", {
      pageTitle: "Checkout",
      path: "/checkout",
      products: products,
      totalSum: totalSum,
    });
  });
}

exports.postOrder = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      const products = user.cart.items.map((i) => {
        return { product: { ...i.productId._doc }, quantity: i.quantity };
      });

      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user, // will pick the id
        },
        products: products,
      });
      return order.save();
    })
    .then((result) => {
      return req.user.clearCart(); // clears the cart after order is placed
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
    .then((orders) => {
      res.render("shop/orders", {
        pageTitle: "Your Orders",
        path: "/orders",
        orders: orders,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;

  Order.findById(orderId)
    .then((order) => {
      if (!order) {
        console.log("No order");
        return next(new Error("No order found"));
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        console.log("Unauthorized Request");
        return next(new Error("Unauthorized Request"));
      }

      const invoiceName = `invoice-${orderId}.pdf`;
      const invoicePath = path.join(
        __dirname,
        "..",
        "data",
        "invoices",
        invoiceName
      );

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename=${invoiceName}`);

      const pdfDoc = new PDFDocument();
      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      pdfDoc.fontSize(26).text("Invoice", {
        underline: true,
        align: "center",
      });
      pdfDoc
        .fontSize(26)
        .text("------------------------------------------------------", {
          align: "center",
        });
      let totalPrice = 0;
      order.products.forEach((product) => {
        totalPrice += product.quantity * product.product.price;
        pdfDoc
          .fontSize(14)
          .text(
            `${product.product.title} - ${product.quantity} x $${product.product.price}`
          );
      });
      pdfDoc
        .fontSize(26)
        .text("------------------------------------------------------", {
          align: "center",
        });
      pdfDoc
        .fontSize(20)
        .text(`Total Price: ${totalPrice}`, { align: "right" });

      pdfDoc.end();

      // ! can lead to issue when the file's size is relatively big
      // fs.readFile(invoicePath, (err, data) => {
      //   if (err) {
      //     next(err);
      //   }

      //   res.setHeader("Content-Type", "application/pdf");
      //   res.setHeader("Content-Disposition", `inline; filename=${invoiceName}`);
      //   res.send(data);
      // });

      // ! this code gives error
      // res.setHeader("Content-Type", "application/pdf");
      // res.setHeader("Content-Disposition", `inline; filename=${invoiceName}`);
      // const file = fs.createReadStream(invoicePath);
      // file.pipe()

      // ! unsafe
      // const file = fs.createReadStream(invoicePath);
      // fs.stat(invoicePath, (err, stat) => {
      //   if (err) {
      //     return next(new Error("Unable to stream file"));
      //   }

      //   res.writeHead(200, {
      //     "Content-Type": "application/pdf",
      //     "Content-Length": stat.size,
      //     "Content-Disposition": `inline; filename=${invoiceName}`,
      //   });

      //   file.pipe(res);
      // });

      // * best solution!
      // res.setHeader("Content-Type", "application/pdf");
      // res.setHeader("Content-Disposition", `inline; filename=${invoiceName}`);
      // res.sendFile(invoicePath);
    })
    .catch((err) => {
      console.log(err);
      next(err);
    });
};
