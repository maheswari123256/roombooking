const House = require("../model/House");

exports.getSuggestedDestinations = async (req, res) => {
  try {
    const destinations = await House.aggregate([
      {
        $group: {
          _id: "$location",     // 🔥 location string
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          title: "$_id",
          subtitle: {
            $concat: [
              { $toString: "$count" },
              " places available"
            ]
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);

    res.status(200).json(destinations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
