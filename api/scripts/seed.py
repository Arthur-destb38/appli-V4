from api.seeds import seed_exercises

if __name__ == "__main__":
    inserted = seed_exercises()
    if inserted:
        print(f"Inserted {inserted} exercises.")
    else:
        print("Seed skipped: dataset already populated.")
