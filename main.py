class Category:
    def __init__(self, name):
        self.name = name
        self.ledger = []

    def deposit(self, amount, description=""):
        self.ledger.append({"amount": amount, "description": description})

    def withdraw(self, amount, description=""):
        if self.check_funds(amount):
            self.ledger.append({"amount": -amount, "description": description})
            return True
        return False

    def get_balance(self):
        return sum(item["amount"] for item in self.ledger)

    def transfer(self, amount, category):
        if self.check_funds(amount):
            self.withdraw(amount, f"Transfer to {category.name}")
            category.deposit(amount, f"Transfer from {self.name}")
            return True
        return False

    def check_funds(self, amount):
        return amount <= self.get_balance()

    def __str__(self):
        title = f"{self.name:*^30}\n"
        items = ""
        for item in self.ledger:
            desc = f"{item['description'][:23]:23}"
            amt = f"{item['amount']:>7.2f}"
            items += f"{desc}{amt}\n"
        total = f"Total: {self.get_balance():.2f}"
        return title + items + total


def create_spend_chart(categories):
    title = "Percentage spent by category\n"

    # Calculate total withdrawals (spending) per category
    spent_amounts = []
    for cat in categories:
        spent = sum(-item["amount"] for item in cat.ledger if item["amount"] < 0)
        spent_amounts.append(spent)

    total_spent = sum(spent_amounts)
    if total_spent == 0:
        percentages = [0] * len(categories)
    else:
        # Rounded down to the nearest 10
        percentages = [int((spent / total_spent) * 100 // 10) * 10 for spent in spent_amounts]

    # Build the bar chart grid from 100 down to 0
    chart = ""
    for level in range(100, -1, -10):
        chart += f"{level:>3}| "
        for pct in percentages:
            chart += "o  " if pct >= level else "   "
        chart += "\n"

    # Divider line: two spaces past the last bar
    chart += "    " + "-" * (3 * len(categories) + 1) + "\n"

    # Write category names vertically
    max_len = max(len(cat.name) for cat in categories)
    names = [cat.name.ljust(max_len) for cat in categories]

    for i in range(max_len):
        chart += "     "
        for name in names:
            chart += f"{name[i]}  "
        if i < max_len - 1:
            chart += "\n"

    return title + chart