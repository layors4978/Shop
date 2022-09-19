exports.get404 = (req, res, next) => {
  res.status(404).render("404", {
    pageTitle: "404",
    path: "/404",
  });
};

//伺服器端的問題
exports.get500 = (req, res, next) => {
  res.status(500).render("500", {
    pageTitle: "500",
    path: "/500",
  });
};
